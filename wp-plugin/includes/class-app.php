<?php
/**
 * The Troche app route.
 *
 * Serves the built single-page app from a configurable slug (default /troche).
 * Logged-out visitors are bounced to wp-login and returned after sign-in;
 * logged-in users get a minimal, theme-free HTML shell that prints a
 * `window.trocheWP` config global (REST URL, nonce, caps) and the dist/ assets.
 * The app renders identically to the standalone GitHub Pages build.
 *
 * @package Troche
 */

namespace Troche;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class App {

	const QUERY_VAR   = 'troche_app';
	const OPTION_SLUG = 'troche_route_slug';
	const DEFAULT_SLUG = 'troche';

	// Deferred-flush flag, set when the slug changes; consumed on the next init
	// once the rewrite rule has been re-registered with the new value.
	const OPTION_FLUSH = 'troche_flush_needed';

	// Bump when the rewrite rule shape changes so existing installs re-flush on
	// the next request without a manual deactivate/reactivate.
	const REWRITE_VERSION = 1;
	const OPTION_RW_VER   = 'troche_rw_version';

	/**
	 * Hook up rewrite, query var, and request handling.
	 */
	public function register() {
		add_action( 'init', array( __CLASS__, 'add_rewrite_rule' ) );
		add_action( 'init', array( $this, 'maybe_flush' ), 20 );
		add_filter( 'query_vars', array( $this, 'add_query_var' ) );
		add_action( 'template_redirect', array( $this, 'maybe_render' ) );
	}

	/**
	 * The current route slug (e.g. "troche"), falling back to the default.
	 *
	 * @return string
	 */
	public static function get_slug() {
		$slug = sanitize_title( (string) get_option( self::OPTION_SLUG, self::DEFAULT_SLUG ) );
		return '' !== $slug ? $slug : self::DEFAULT_SLUG;
	}

	/**
	 * Normalize a submitted slug, falling back to the default when empty.
	 *
	 * @param string $slug Raw value.
	 * @return string
	 */
	public static function sanitize_slug( $slug ) {
		$slug = sanitize_title( (string) $slug );
		return '' !== $slug ? $slug : self::DEFAULT_SLUG;
	}

	/**
	 * The absolute URL of the app route.
	 *
	 * @return string
	 */
	public static function get_url() {
		return home_url( '/' . self::get_slug() . '/' );
	}

	/**
	 * Register the pretty permalink for the app route.
	 */
	public static function add_rewrite_rule() {
		$escaped = preg_quote( self::get_slug(), '/' );
		add_rewrite_rule(
			'^' . $escaped . '/?$',
			'index.php?' . self::QUERY_VAR . '=1',
			'top'
		);
	}

	/**
	 * Flush rewrite rules once after the slug changes, or when the rule shape
	 * itself has changed between plugin versions.
	 */
	public function maybe_flush() {
		$needs_flush = (bool) get_option( self::OPTION_FLUSH );

		if ( (int) get_option( self::OPTION_RW_VER ) !== self::REWRITE_VERSION ) {
			$needs_flush = true;
			update_option( self::OPTION_RW_VER, self::REWRITE_VERSION, false );
		}

		if ( $needs_flush ) {
			flush_rewrite_rules();
			delete_option( self::OPTION_FLUSH );
		}
	}

	/**
	 * @param string[] $vars Registered query vars.
	 * @return string[]
	 */
	public function add_query_var( $vars ) {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/**
	 * If this request targets the app route, gate on auth and serve the shell.
	 */
	public function maybe_render() {
		if ( ! get_query_var( self::QUERY_VAR ) ) {
			return;
		}

		// Logged-out visitors bounce to wp-login and return here after sign-in.
		if ( ! is_user_logged_in() ) {
			auth_redirect();
			exit; // auth_redirect() already exits when redirecting; belt-and-suspenders.
		}

		$this->render_shell();
		exit;
	}

	/**
	 * Print the self-contained app shell: the built index.html with its asset
	 * URLs rewritten to the plugin's dist/ directory, plus the window.trocheWP
	 * config global. The theme is never involved.
	 */
	private function render_shell() {
		$index = TROCHE_DIR . 'dist/index.html';

		nocache_headers();
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		status_header( 200 );

		if ( ! file_exists( $index ) ) {
			echo '<!doctype html><meta charset="utf-8"><title>Troche</title>';
			echo '<p>The Troche app has not been built yet. Run <code>npm run build</code> and reinstall the plugin.</p>';
			return;
		}

		$html     = (string) file_get_contents( $index ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reading a bundled plugin file, not a remote resource.
		$dist_url = trailingslashit( plugins_url( 'dist', TROCHE_FILE ) );

		// Vite (base: './') emits relative asset refs like "./assets/..." and
		// "./troche-icon.svg"; point them at the plugin's dist directory.
		$html = str_replace( '"./', '"' . esc_url( $dist_url ), $html );

		$config = array(
			'restUrl'  => esc_url_raw( rest_url( Rest_Controller::NAMESPACE ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'canEdit'  => current_user_can( Store::CAP_EDIT ),
			'loginUrl' => wp_login_url( self::get_url() ),
		);

		// Classic inline script: runs during parse, before the deferred module
		// script that boots the app, so the global is set in time.
		$inject = '<script>window.trocheWP = ' . wp_json_encode( $config ) . ';</script>';
		$html   = str_replace( '</head>', $inject . '</head>', $html );

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built HTML shell; asset URLs are esc_url'd and the injected config is wp_json_encode'd above.
		echo $html;
	}
}
