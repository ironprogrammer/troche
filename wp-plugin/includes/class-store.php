<?php
/**
 * Persistence for song forms.
 *
 * One post per song in a non-public custom post type. The song's JSON lives in
 * post_content, so WordPress revisions give a free, wp-admin-restorable save
 * history. Post IDs are opaque save handles; songs get no slugs or public URLs.
 *
 * @package Troche
 */

namespace Troche;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Store {

	/**
	 * Custom post type holding one song per post. Non-public: never queryable
	 * on the front end, excluded from search.
	 */
	const POST_TYPE = 'troche_song';

	/**
	 * Capability required to write (create / update / delete) songs. Read only
	 * requires being logged in.
	 */
	const CAP_EDIT = 'troche_edit';

	/**
	 * How many revisions to keep per song. Save history is useful but unbounded
	 * revisions bloat the DB, so cap it.
	 */
	const REVISIONS_TO_KEEP = 50;

	/**
	 * Envelope format/version the app reads and writes. Matches the client's
	 * export shape so the two are interchangeable.
	 */
	const FORMAT  = 'troche';
	const VERSION = 1;

	/**
	 * Register the post type and revision cap.
	 */
	public static function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Songs', 'troche' ),
					'singular_name' => __( 'Song', 'troche' ),
				),
				// Kept entirely off the public web — this is band IP.
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				// Show a minimal admin UI so administrators can browse and
				// restore revisions from wp-admin. Kept out of the main menu;
				// day-to-day editing happens in the Troche app, not here.
				'show_ui'             => true,
				'show_in_menu'        => false,
				'show_in_rest'        => false,
				'supports'            => array( 'title', 'editor', 'revisions', 'author' ),
				// Gate every wp-admin action on this post type behind troche_edit,
				// not core post caps. Without this, an Editor (edit_others_posts)
				// or an Author (own posts) could edit or trash songs from
				// edit.php?post_type=troche_song — bypassing troche_edit and the
				// REST layer's sanitize_song(). map_meta_cap is off so the meta
				// caps below are checked literally rather than remapped to 'post'.
				'capability_type'     => self::POST_TYPE,
				'map_meta_cap'        => false,
				'capabilities'        => array(
					'edit_post'           => self::CAP_EDIT,
					'read_post'           => self::CAP_EDIT,
					'delete_post'         => self::CAP_EDIT,
					'edit_posts'          => self::CAP_EDIT,
					'edit_others_posts'   => self::CAP_EDIT,
					'publish_posts'       => self::CAP_EDIT,
					'read_private_posts'  => self::CAP_EDIT,
					'delete_posts'        => self::CAP_EDIT,
					'delete_others_posts' => self::CAP_EDIT,
					'create_posts'        => self::CAP_EDIT,
				),
			)
		);

		// Cap revision history per song. Only applies to our post type.
		add_filter(
			'wp_' . self::POST_TYPE . '_revisions_to_keep',
			static function () {
				return self::REVISIONS_TO_KEEP;
			}
		);
	}

	/**
	 * Every live song post, oldest first. Shared by get_library() and
	 * get_state() so the two can never disagree about what's in the library.
	 *
	 * @return \WP_Post[]
	 */
	private static function get_song_posts() {
		return get_posts(
			array(
				'post_type'        => self::POST_TYPE,
				'post_status'      => 'publish',
				'numberposts'      => -1,
				'orderby'          => 'ID',
				'order'            => 'ASC',
				'suppress_filters' => false,
			)
		);
	}

	/**
	 * The whole library in the envelope format, each song decorated with its
	 * post id (`wpId`) as the save handle and its version token (`wpToken`).
	 * Trashed songs are excluded.
	 *
	 * @return array { format:string, version:int, songs:array[] }
	 */
	public static function get_library() {
		$songs = array();
		foreach ( self::get_song_posts() as $post ) {
			$song = self::decode_song( $post->post_content );
			if ( null === $song ) {
				continue;
			}
			$song['wpId']    = (int) $post->ID;
			$song['wpToken'] = self::token( $post->post_content );
			$songs[]         = $song;
		}

		return array(
			'format'  => self::FORMAT,
			'version' => self::VERSION,
			'songs'   => $songs,
		);
	}

	/**
	 * Version tokens for every live song, keyed by post id — the cheap "has
	 * anything moved?" probe a second tab polls before it saves. Carries no
	 * song content, so it stays small however big the library gets.
	 *
	 * @return array { tokens: array<string,string> }
	 */
	public static function get_state() {
		$tokens = array();
		foreach ( self::get_song_posts() as $post ) {
			if ( null === self::decode_song( $post->post_content ) ) {
				// Skip unparseable posts, exactly as get_library() does, so the
				// two views agree on which songs exist.
				continue;
			}
			$tokens[ (string) $post->ID ] = self::token( $post->post_content );
		}

		return array( 'tokens' => (object) $tokens );
	}

	/**
	 * A song's version token: a hash of its stored JSON.
	 *
	 * Content-derived rather than time-derived on purpose. post_modified_gmt
	 * only has one-second resolution (two saves in the same second look
	 * identical) and it moves even when a save rewrites byte-identical content,
	 * which would show up in another tab as a phantom conflict. Clients only
	 * ever compare tokens for equality — they never compute one — so the hash
	 * is free to change shape later.
	 *
	 * @param string $content post_content.
	 * @return string
	 */
	private static function token( $content ) {
		return md5( (string) $content );
	}

	/**
	 * Create or update one song.
	 *
	 * @param array    $song  Sanitized song object.
	 * @param int|null $wp_id Existing post id to update, or null to create.
	 * @param int      $user  Author id for new posts.
	 * @return array|\WP_Error The saved song (with wpId), or an error.
	 */
	public static function save_song( array $song, $wp_id, $user ) {
		$title = isset( $song['name'] ) && '' !== trim( (string) $song['name'] )
			? (string) $song['name']
			: __( 'Untitled Song', 'troche' );

		// Defense for non-app callers: every stored song needs a non-empty id
		// (the app's stable per-song key). The app always sends one; this only
		// fires for a caller that omitted it. Cross-song uniqueness is repaired
		// client-side on load (see normalizeLibrary), keyed off wpId.
		if ( empty( $song['id'] ) || ! is_string( $song['id'] ) ) {
			$song['id'] = self::generate_id();
		}

		// wpId and wpToken are server-side handles, not part of the stored envelope.
		unset( $song['wpId'], $song['wpToken'] );

		// wp_insert_post()/wp_update_post() expect slashed input and strip one
		// level of slashes on the way in; the encoded JSON contains backslashes
		// (e.g. ♭ for ♭), so it must be slashed to survive the round-trip.
		$postarr = array(
			'post_type'    => self::POST_TYPE,
			'post_status'  => 'publish',
			'post_title'   => wp_slash( $title ),
			'post_content' => wp_slash( self::encode_song( $song ) ),
		);

		if ( $wp_id ) {
			$existing = get_post( $wp_id );
			if ( ! $existing || self::POST_TYPE !== $existing->post_type || 'trash' === $existing->post_status ) {
				return new \WP_Error(
					'troche_not_found',
					__( 'That song does not exist.', 'troche' ),
					array( 'status' => 404 )
				);
			}
			$postarr['ID'] = (int) $wp_id;
			$result        = wp_update_post( $postarr, true );
		} else {
			$postarr['post_author'] = (int) $user;
			$result                 = wp_insert_post( $postarr, true );
		}

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Token comes from the post as actually stored, not from the string we
		// sent: wp_insert_post()/wp_update_post() run content through save
		// filters (kses for users without unfiltered_html, among others), and a
		// token that didn't survive those filters would read as a conflict on
		// the very next poll.
		$stored = get_post( (int) $result );

		$song['wpId']    = (int) $result;
		$song['wpToken'] = self::token( $stored ? $stored->post_content : '' );
		return $song;
	}

	/**
	 * Move a song to the trash (30-day undo; never a hard delete).
	 *
	 * @param int $wp_id Post id.
	 * @return bool|\WP_Error True on success, error if the id isn't a live song.
	 */
	public static function delete_song( $wp_id ) {
		$post = get_post( $wp_id );
		if ( ! $post || self::POST_TYPE !== $post->post_type || 'trash' === $post->post_status ) {
			return new \WP_Error(
				'troche_not_found',
				__( 'That song does not exist.', 'troche' ),
				array( 'status' => 404 )
			);
		}

		return (bool) wp_trash_post( $wp_id );
	}

	/**
	 * Generate a short song id in the same shape the app's uid() produces
	 * (8 lowercase base36 chars), for the rare write that arrives without one.
	 *
	 * @return string
	 */
	private static function generate_id() {
		return strtolower( wp_generate_password( 8, false, false ) );
	}

	/**
	 * Decode a stored song JSON blob back into an array.
	 *
	 * @param string $content post_content.
	 * @return array|null The song, or null if it can't be parsed.
	 */
	private static function decode_song( $content ) {
		$data = json_decode( $content, true );
		return is_array( $data ) ? $data : null;
	}

	/**
	 * Encode a song array to the JSON stored in post_content.
	 *
	 * @param array $song Song.
	 * @return string
	 */
	private static function encode_song( array $song ) {
		return wp_json_encode( $song );
	}

	/**
	 * Recursively sanitize a decoded song: strip tags from string leaves,
	 * leave numbers and booleans intact. Keys are app-controlled and preserved
	 * as-is (they carry meaning like `timeSigTop`). Newlines are kept so
	 * multi-line cues survive.
	 *
	 * @param mixed $value Raw decoded value.
	 * @return mixed
	 */
	public static function sanitize_song( $value ) {
		if ( is_array( $value ) ) {
			$clean = array();
			foreach ( $value as $key => $item ) {
				$clean[ $key ] = self::sanitize_song( $item );
			}
			return $clean;
		}
		if ( is_string( $value ) ) {
			return sanitize_textarea_field( $value );
		}
		// Numbers, booleans, null pass through unchanged.
		return $value;
	}
}
