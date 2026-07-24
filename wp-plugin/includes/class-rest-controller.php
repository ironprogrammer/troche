<?php
/**
 * REST endpoints under troche/v1.
 *
 * - GET    /library        Whole library in the envelope format (login required).
 * - POST   /songs          Create a song              (troche_edit required).
 * - PUT    /songs/{id}      Update a song              (troche_edit required).
 * - DELETE /songs/{id}      Trash a song               (troche_edit required).
 *
 * Auth is cookie + nonce (same-origin); there is no CORS surface. Reads gate on
 * being logged in; writes gate on the troche_edit capability.
 *
 * @package Troche
 */

namespace Troche;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Rest_Controller {

	const NAMESPACE = 'troche/v1';

	/**
	 * Register routes on rest_api_init.
	 */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Define the routes.
	 */
	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/library',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_library' ),
				'permission_callback' => array( $this, 'can_read' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/songs',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_song' ),
				'permission_callback' => array( $this, 'can_write' ),
			)
		);

		// The URL capture is named `wp_id`, not `id`, so it can't collide with
		// the song's own `id` field in the JSON body (a same-named route arg
		// would apply its absint sanitizer to the body value too).
		$id_arg = array(
			'wp_id' => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
			),
		);

		register_rest_route(
			self::NAMESPACE,
			'/songs/(?P<wp_id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_song' ),
					'permission_callback' => array( $this, 'can_write' ),
					'args'                => $id_arg,
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_song' ),
					'permission_callback' => array( $this, 'can_write' ),
					'args'                => $id_arg,
				),
			)
		);
	}

	/**
	 * Reading the library requires only a logged-in user.
	 *
	 * @return bool
	 */
	public function can_read() {
		return is_user_logged_in();
	}

	/**
	 * Writing requires the troche_edit capability.
	 *
	 * @return bool
	 */
	public function can_write() {
		return current_user_can( Store::CAP_EDIT );
	}

	/**
	 * Return the whole library.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_library() {
		return rest_ensure_response( Store::get_library() );
	}

	/**
	 * Create a song from the request body.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_song( \WP_REST_Request $request ) {
		return $this->write( $request, null );
	}

	/**
	 * Update an existing song.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_song( \WP_REST_Request $request ) {
		$url_params = $request->get_url_params();
		return $this->write( $request, (int) ( $url_params['wp_id'] ?? 0 ) );
	}

	/**
	 * Shared create/update path: pull the song object from the JSON body,
	 * sanitize it, and persist.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @param int|null         $wp_id   Post id to update, or null to create.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function write( \WP_REST_Request $request, $wp_id ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) || empty( $body ) || ! isset( $body['parts'] ) ) {
			return new \WP_Error(
				'troche_invalid_song',
				__( 'Expected a song object with a parts array.', 'troche' ),
				array( 'status' => 400 )
			);
		}

		$song  = Store::sanitize_song( $body );
		$saved = Store::save_song( $song, $wp_id, get_current_user_id() );

		if ( is_wp_error( $saved ) ) {
			return $saved;
		}

		$status = $wp_id ? 200 : 201;
		return new \WP_REST_Response( $saved, $status );
	}

	/**
	 * Trash a song.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_song( \WP_REST_Request $request ) {
		$url_params = $request->get_url_params();
		$wp_id      = (int) ( $url_params['wp_id'] ?? 0 );
		$result     = Store::delete_song( $wp_id );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $result ) {
			return new \WP_Error(
				'troche_delete_failed',
				__( 'The song could not be trashed.', 'troche' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'wpId'    => $wp_id,
			)
		);
	}
}
