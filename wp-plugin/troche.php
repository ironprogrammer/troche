<?php
/**
 * Plugin Name:       Troche
 * Plugin URI:        https://github.com/ironprogrammer/troche
 * Description:        Server-side storage and login gating for the Troche song-form arranger. Bandmates save and load song forms through the site instead of passing JSON files around; songs stay off the public web.
 * Version:           1.2.0
 * Requires at least: 6.9
 * Requires PHP:      7.4
 * Author:            Brian Alexander
 * Author URI:        https://github.com/ironprogrammer
 * License:           GPL-2.0-or-later
 * Text Domain:       troche
 *
 * @package Troche
 */

namespace Troche;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TROCHE_VERSION', '1.2.0' );
define( 'TROCHE_FILE', __FILE__ );
define( 'TROCHE_DIR', plugin_dir_path( __FILE__ ) );
define( 'TROCHE_URL', plugin_dir_url( __FILE__ ) );

require_once TROCHE_DIR . 'includes/class-store.php';
require_once TROCHE_DIR . 'includes/class-rest-controller.php';
require_once TROCHE_DIR . 'includes/class-app.php';
require_once TROCHE_DIR . 'includes/class-admin.php';

/**
 * Boot the plugin once all classes are loaded.
 */
function bootstrap() {
	add_action( 'init', array( Store::class, 'register' ) );
	( new Rest_Controller() )->register();
	( new App() )->register();

	if ( is_admin() ) {
		( new Admin() )->register();
	}
}
add_action( 'plugins_loaded', __NAMESPACE__ . '\\bootstrap' );

/**
 * On activation: grant the editing capability to administrators so the
 * installer always has access (no user-specific grants ship in code — the
 * per-user toggle lives on Settings → Troche), then register the app-route
 * rewrite and flush so the pretty URL works immediately.
 */
function activate() {
	$admin = get_role( 'administrator' );
	if ( $admin && ! $admin->has_cap( Store::CAP_EDIT ) ) {
		$admin->add_cap( Store::CAP_EDIT );
	}

	App::add_rewrite_rule();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, __NAMESPACE__ . '\\activate' );

/**
 * On deactivation, drop the app-route rewrite rule.
 */
function deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, __NAMESPACE__ . '\\deactivate' );
