<?php
/**
 * Plugin-logic harness, run inside WordPress Playground with the plugin source
 * mounted and activated. Exercises the post type, the REST CRUD endpoints, both
 * auth gates, revisions, and trash-on-delete via internal REST requests.
 * Writes PASS/FAIL lines to /work/result.txt (mounted back to the host).
 *
 * Not shipped with the plugin — lives in the repo's tests/ dir.
 */

require '/wordpress/wp-load.php';

$out = '/work/result.txt';
file_put_contents( $out, '' );
$pass = 0;
$fail = 0;
function check( $label, $cond ) {
	global $pass, $fail, $out;
	$line = ( $cond ? 'PASS' : 'FAIL' ) . ": $label";
	$cond ? $pass++ : $fail++;
	file_put_contents( $out, $line . "\n", FILE_APPEND );
}
function troche_rest( $method, $route, $body = null ) {
	$req = new WP_REST_Request( $method, $route );
	if ( null !== $body ) {
		$req->set_header( 'Content-Type', 'application/json' );
		$req->set_body( wp_json_encode( $body ) );
	}
	return rest_do_request( $req );
}

// ---- post type ----
check( 'CPT troche_song registered', post_type_exists( 'troche_song' ) );
$pt = get_post_type_object( 'troche_song' );
check( 'CPT is non-public', $pt && false === $pt->public );
check( 'CPT excluded from search', $pt && true === $pt->exclude_from_search );
check( 'CPT not publicly queryable', $pt && false === $pt->publicly_queryable );
check( 'CPT supports revisions', post_type_supports( 'troche_song', 'revisions' ) );
check( 'revisions capped at 50', 50 === (int) apply_filters( 'wp_troche_song_revisions_to_keep', -1 ) );

// ---- users / caps ----
$admins   = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
$admin_id = (int) ( $admins[0] ?? 0 );
check( 'admin has troche_edit (granted on activation)', user_can( $admin_id, 'troche_edit' ) );
$sub_id = wp_insert_user(
	array(
		'user_login' => 'bandmate',
		'user_pass'  => wp_generate_password(),
		'user_email' => 'bandmate@example.test',
		'role'       => 'subscriber',
	)
);
check( 'subscriber lacks troche_edit by default', ! is_wp_error( $sub_id ) && ! user_can( $sub_id, 'troche_edit' ) );

$song = array(
	'id'         => 'abc123',
	'name'       => 'Test Song',
	'bpm'        => 120,
	'musicalKey' => 'A♭',
	'parts'      => array( array( 'id' => 'p1', 'name' => 'Intro', 'measures' => 4, 'cue' => 'line one' ) ),
);

// ---- read gate ----
wp_set_current_user( 0 );
check( 'GET /library logged-out -> 401', 401 === troche_rest( 'GET', '/troche/v1/library' )->get_status() );
wp_set_current_user( $sub_id );
$r = troche_rest( 'GET', '/troche/v1/library' );
check( 'GET /library as subscriber -> 200', 200 === $r->get_status() );
check( 'library envelope has format=troche', 'troche' === ( $r->get_data()['format'] ?? '' ) );

// ---- write gate ----
check( 'POST /songs as capless subscriber -> 403', 403 === troche_rest( 'POST', '/troche/v1/songs', $song )->get_status() );
( new WP_User( $sub_id ) )->add_cap( 'troche_edit' );
wp_set_current_user( 0 );
wp_set_current_user( $sub_id );
check( 'subscriber now has troche_edit', user_can( $sub_id, 'troche_edit' ) );

$r = troche_rest( 'POST', '/troche/v1/songs', $song );
check( 'POST /songs as capped subscriber -> 201', 201 === $r->get_status() );
$wp_id = (int) ( $r->get_data()['wpId'] ?? 0 );
check( 'create returns a wpId', $wp_id > 0 );

// ---- read back ----
$data = troche_rest( 'GET', '/troche/v1/library' )->get_data();
check( 'library now has 1 song', 1 === count( $data['songs'] ) );
check( 'song carries wpId', ( $data['songs'][0]['wpId'] ?? 0 ) === $wp_id );
check( 'unicode key round-trips', 'A♭' === ( $data['songs'][0]['musicalKey'] ?? '' ) );

// ---- wp-admin cap mapping (post-type actions gate on troche_edit, not core post caps) ----
$editor_id = wp_insert_user(
	array(
		'user_login' => 'bandeditor',
		'user_pass'  => wp_generate_password(),
		'user_email' => 'bandeditor@example.test',
		'role'       => 'editor',
	)
);
check( 'editor lacks troche_edit', ! is_wp_error( $editor_id ) && ! user_can( $editor_id, 'troche_edit' ) );
// A core Editor has edit_others_posts/delete_others_posts, which before the cap
// mapping let them edit or trash songs at edit.php?post_type=troche_song without
// troche_edit and bypassing sanitize_song(). The mapping closes that.
check( 'editor cannot edit a song in wp-admin', ! user_can( $editor_id, 'edit_post', $wp_id ) );
check( 'editor cannot trash a song in wp-admin', ! user_can( $editor_id, 'delete_post', $wp_id ) );
// The song-list screen (edit.php) gates on the post type's edit_posts cap,
// which the mapping resolves to troche_edit.
$list_cap = get_post_type_object( 'troche_song' )->cap->edit_posts;
check( 'song list cap maps to troche_edit', 'troche_edit' === $list_cap );
check( 'editor cannot open the song list', ! user_can( $editor_id, $list_cap ) );
// Holders of troche_edit (admins, checked bandmates) keep full wp-admin access,
// so revision restore still works.
check( 'admin can edit a song in wp-admin (revision restore)', user_can( $admin_id, 'edit_post', $wp_id ) );
check( 'capped subscriber can edit a song in wp-admin', user_can( $sub_id, 'edit_post', $wp_id ) );

// ---- update + revision ----
$song['name'] = 'Renamed Song';
$song['wpId'] = $wp_id;
check( 'PUT /songs/{id} -> 200', 200 === troche_rest( 'PUT', '/troche/v1/songs/' . $wp_id, $song )->get_status() );
check( 'post_title updated', 'Renamed Song' === get_post_field( 'post_title', $wp_id ) );
$stored = json_decode( get_post_field( 'post_content', $wp_id ), true );
check( 'stored content omits wpId', ! isset( $stored['wpId'] ) );
check( 'update created a revision', count( wp_get_post_revisions( $wp_id ) ) >= 1 );
check( 'PUT bad id -> 404', 404 === troche_rest( 'PUT', '/troche/v1/songs/999999', $song )->get_status() );

// ---- delete -> trash ----
check( 'DELETE /songs/{id} -> 200', 200 === troche_rest( 'DELETE', '/troche/v1/songs/' . $wp_id )->get_status() );
check( 'post moved to trash (not hard-deleted)', 'trash' === get_post_status( $wp_id ) );
check( 'trashed song excluded from library', 0 === count( troche_rest( 'GET', '/troche/v1/library' )->get_data()['songs'] ) );

// ---- server assigns an id when missing ----
$r      = troche_rest( 'POST', '/troche/v1/songs', array( 'name' => 'No Id', 'parts' => array() ) );
$noid   = troche_rest( 'GET', '/troche/v1/library' )->get_data()['songs'];
$last   = end( $noid );
check( 'server assigns an id when one is missing', ! empty( $last['id'] ) && is_string( $last['id'] ) );

// ---- plain-permalinks admin notice ----
wp_set_current_user( $admin_id );
$admin_ui = new \Troche\Admin();

update_option( 'permalink_structure', '' ); // Plain
ob_start();
$admin_ui->maybe_permalink_notice();
$notice_plain = ob_get_clean();
check( 'permalink notice shown on Plain permalinks', false !== strpos( $notice_plain, 'permalink' ) );

update_option( 'permalink_structure', '/%postname%/' ); // Pretty
ob_start();
$admin_ui->maybe_permalink_notice();
$notice_pretty = ob_get_clean();
check( 'permalink notice hidden once permalinks are set', '' === trim( $notice_pretty ) );

file_put_contents( $out, "\n=== $pass passed, $fail failed ===\n", FILE_APPEND );
echo 'done';
