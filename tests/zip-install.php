<?php
/**
 * Assertions run inside WordPress Playground after installing troche.zip.
 * Writes PASS/FAIL lines to /work/result.txt (mounted back to the host).
 *
 * Not shipped with the plugin — lives in the repo's tests/ dir.
 */

require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

$out = '/work/result.txt';
file_put_contents( $out, '' );
$pass = 0;
$fail = 0;
function check( $label, $cond ) {
	global $pass, $fail, $out;
	if ( $cond ) {
		++$pass;
		$line = "PASS: $label";
	} else {
		++$fail;
		$line = "FAIL: $label";
	}
	file_put_contents( $out, $line . "\n", FILE_APPEND );
}

$dir = WP_PLUGIN_DIR . '/troche';

// The zip unpacked to the right place with the right contents.
check( 'zip unpacked to wp-content/plugins/troche/', file_exists( $dir . '/troche.php' ) );
check( 'includes/ shipped', file_exists( $dir . '/includes/class-store.php' ) );
check( 'built dist/index.html shipped', file_exists( $dir . '/dist/index.html' ) );
check( 'built app JS shipped', count( glob( $dir . '/dist/assets/*.js' ) ) > 0 );
check( 'no source (src/) leaked into the package', ! file_exists( $dir . '/src' ) );

// It activated cleanly.
check( 'plugin active', is_plugin_active( 'troche/troche.php' ) );
check( 'version is 1.0.0', defined( 'TROCHE_VERSION' ) && '1.0.0' === TROCHE_VERSION );
check( 'song post type registered', post_type_exists( 'troche_song' ) );
check( 'activation granted admin troche_edit', user_can( 1, 'troche_edit' ) );

$rules     = get_option( 'rewrite_rules' );
$has_route = false;
if ( is_array( $rules ) ) {
	foreach ( $rules as $target ) {
		if ( false !== strpos( (string) $target, 'troche_app' ) ) {
			$has_route = true;
			break;
		}
	}
}
check( 'app route rewrite registered', $has_route );

// The REST gates work on the installed plugin.
function troche_rest( $method, $route ) {
	return rest_do_request( new WP_REST_Request( $method, $route ) );
}
wp_set_current_user( 0 );
check( 'GET /troche/v1/library logged-out -> 401', 401 === troche_rest( 'GET', '/troche/v1/library' )->get_status() );
wp_set_current_user( 1 );
$r = troche_rest( 'GET', '/troche/v1/library' );
check( 'GET /troche/v1/library as admin -> 200', 200 === $r->get_status() );
check( 'library envelope has format=troche', 'troche' === ( $r->get_data()['format'] ?? '' ) );

file_put_contents( $out, "\n=== $pass passed, $fail failed ===\n", FILE_APPEND );
echo 'done';
