<?php
/**
 * Settings → Troche.
 *
 * Two controls: the app route slug, and a per-user checklist that grants or
 * revokes the troche_edit capability. Administrators always have troche_edit
 * (added to the role on activation) and so are not listed here.
 *
 * @package Troche
 */

namespace Troche;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin {

	const PAGE_SLUG = 'troche';

	/**
	 * Hook up the menu, the save handler, and the plugin-row Settings link.
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'maybe_save' ) );
		add_action( 'admin_notices', array( $this, 'maybe_permalink_notice' ) );
		add_filter(
			'plugin_action_links_' . plugin_basename( TROCHE_FILE ),
			array( $this, 'action_links' )
		);
	}

	/**
	 * Warn administrators when the site uses plain permalinks — the app route
	 * ( /{slug}/ ) can't resolve without a permalink structure. The notice
	 * clears itself once permalinks are set.
	 */
	public function maybe_permalink_notice() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( '' !== get_option( 'permalink_structure' ) ) {
			return;
		}

		$message = sprintf(
			/* translators: %s: URL of the Permalinks settings screen. */
			__( 'Troche needs pretty permalinks to serve the app. Set <a href="%s">Settings &rarr; Permalinks</a> to any option other than Plain.', 'troche' ),
			esc_url( admin_url( 'options-permalink.php' ) )
		);

		printf(
			'<div class="notice notice-warning"><p>%s</p></div>',
			wp_kses( $message, array( 'a' => array( 'href' => array() ) ) )
		);
	}

	/**
	 * Add a Settings link to the plugin's row on the Plugins screen.
	 *
	 * @param string[] $links Existing action links.
	 * @return string[]
	 */
	public function action_links( $links ) {
		$settings = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'options-general.php?page=' . self::PAGE_SLUG ) ),
			esc_html__( 'Settings', 'troche' )
		);
		array_unshift( $links, $settings );
		return $links;
	}

	/**
	 * Add the settings submenu page under Settings.
	 */
	public function add_menu() {
		add_options_page(
			__( 'Troche', 'troche' ),
			__( 'Troche', 'troche' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render' )
		);
	}

	/**
	 * Handle the settings form submission: save the slug and toggle caps.
	 */
	public function maybe_save() {
		if ( ! isset( $_POST['troche_nonce'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		check_admin_referer( 'troche_save', 'troche_nonce' );

		// Route slug.
		$slug = App::sanitize_slug( isset( $_POST['troche_slug'] ) ? wp_unslash( $_POST['troche_slug'] ) : '' );
		$old  = App::get_slug();
		update_option( App::OPTION_SLUG, $slug );
		if ( $slug !== $old ) {
			// Defer the rewrite flush to the next init, after the rule is
			// re-registered with the new slug.
			update_option( App::OPTION_FLUSH, 1, false );
		}

		// Per-user caps. Only touch users we actually rendered (the hidden
		// candidate list), so we never strip caps from anyone off-screen.
		$candidates = isset( $_POST['troche_candidates'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['troche_candidates'] ) ) : array();
		$granted    = isset( $_POST['troche_edit_users'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['troche_edit_users'] ) ) : array();

		foreach ( $candidates as $user_id ) {
			$user = get_user_by( 'id', $user_id );
			if ( ! $user ) {
				continue;
			}
			if ( in_array( $user_id, $granted, true ) ) {
				$user->add_cap( Store::CAP_EDIT );
			} else {
				$user->remove_cap( Store::CAP_EDIT );
			}
		}

		// Registered here on admin_init; rendered by settings_errors() below in
		// the same request (no redirect, so no transient handoff needed).
		add_settings_error( 'troche', 'troche_saved', __( 'Settings saved.', 'troche' ), 'success' );
	}

	/**
	 * Render the settings page.
	 */
	public function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$slug = App::get_slug();
		$url  = App::get_url();

		// Everyone who isn't an administrator is a candidate band member.
		$users = get_users(
			array(
				'role__not_in' => array( 'administrator' ),
				'orderby'      => 'display_name',
				'number'       => 500,
			)
		);
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Troche', 'troche' ); ?></h1>
			<?php settings_errors( 'troche' ); ?>

			<form method="post" action="">
				<?php wp_nonce_field( 'troche_save', 'troche_nonce' ); ?>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">
							<label for="troche_slug"><?php esc_html_e( 'App route', 'troche' ); ?></label>
						</th>
						<td>
							<code><?php echo esc_html( trailingslashit( home_url() ) ); ?></code>
							<input name="troche_slug" id="troche_slug" type="text" class="regular-text code"
								value="<?php echo esc_attr( $slug ); ?>" />
							<p class="description">
								<?php
								printf(
									/* translators: %s: the app URL. */
									esc_html__( 'The app is served at %s. Members must be logged in to view it.', 'troche' ),
									'<a href="' . esc_url( $url ) . '">' . esc_html( $url ) . '</a>'
								);
								?>
							</p>
						</td>
					</tr>

					<tr>
						<th scope="row"><?php esc_html_e( 'Editors', 'troche' ); ?></th>
						<td>
							<?php if ( empty( $users ) ) : ?>
								<p class="description">
									<?php esc_html_e( 'No non-administrator users yet. Add band members as Subscribers, then grant them editing here.', 'troche' ); ?>
								</p>
							<?php else : ?>
								<p class="description" style="margin-bottom:8px">
									<?php esc_html_e( 'Checked users can save songs. Unchecked users can view but not edit. Administrators always have access.', 'troche' ); ?>
								</p>
								<fieldset>
									<?php foreach ( $users as $user ) : ?>
										<input type="hidden" name="troche_candidates[]" value="<?php echo esc_attr( $user->ID ); ?>" />
										<label style="display:block;margin:4px 0">
											<input type="checkbox" name="troche_edit_users[]"
												value="<?php echo esc_attr( $user->ID ); ?>"
												<?php checked( user_can( $user->ID, Store::CAP_EDIT ) ); ?> />
											<?php
											echo esc_html( $user->display_name );
											echo ' <span style="color:#646970">(' . esc_html( $user->user_login ) . ' · ' . esc_html( $user->user_email ) . ')</span>';
											?>
										</label>
									<?php endforeach; ?>
								</fieldset>
							<?php endif; ?>
						</td>
					</tr>
				</table>

				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
