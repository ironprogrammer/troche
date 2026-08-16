=== Troche ===
Contributors: ironprogrammer
Tags: music, band, arrangement, songwriting
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.2.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Private, login-gated storage for the Troche song-form arranger. Bandmates save and load song forms through your site instead of passing files around.

== Description ==

Troche is a web app for building song arrangements — vertical stacks of named,
colored parts (intro, verse, chorus…) with per-part measures and time
signatures, plus a visual and audible click for playback.

This plugin serves the app from your WordPress site and adds:

* **Server-side storage.** Song forms are saved to your site, so any signed-in
  band member sees the same library from any device — no file passing.
* **Login gating.** The app is only visible to logged-in users. Songs are
  stored in a non-public post type and never appear on the public web or in
  search.
* **Per-member editing.** Members can view the library; only members you grant
  the editing capability can change it.
* **Autosave and save history.** Edits save automatically, and every save is a
  WordPress revision you can review and restore from the dashboard.
* **Import and export.** Move a library in or out as JSON at any time.

The app is served at a URL you choose (default `/troche`), styled entirely by
the app — your theme is not involved.

== Installation ==

1. Upload `troche.zip` on **Plugins → Add New → Upload Plugin**, then activate.
   The app route needs pretty permalinks — set **Settings → Permalinks** to any
   option other than Plain.
2. Go to **Settings → Troche**. Set the app URL slug (default `troche`) and
   check the members who should be allowed to edit. Administrators can always
   edit.
3. Add band members as WordPress users (the Subscriber role is enough), then
   grant them editing on the same screen.
4. Visit the app URL (for example `https://your-site.example/troche/`). Signed-
   out visitors are sent to log in first.

To move an existing library onto the site, use the app's Export on your old
setup and Import once signed in.

== Frequently Asked Questions ==

= How do I let a band member edit songs? =

On **Settings → Troche**, check the box next to their name. Unchecked members
can view but not change the library.

= Are the songs public? =

No. They live in a non-public post type, are excluded from search, and the app
is shown only to logged-in users.

= I deleted a song by mistake. =

Deleted songs go to the trash, and every save is kept as a revision, so you can
restore either from the dashboard.

== Changelog ==

= 1.2.0 =
* Split each part's cue into three lanes — chords, lyric, and performance direction — each in its own typography, and each one hideable from the transport bar.
* Add chord entry helpers (♭ ♯ Δ ° | % /) that insert at the cursor, so the symbols don't need a special keyboard.
* Print the three lanes as stacked lines on the printed chart, dropping any a part leaves empty.
* Cue lines now wrap instead of running off the edge, and use the full width of a part on a phone.
* An existing part's cue becomes its lyric lane; splitting chords and direction out of it is a manual pass.
* Fix tapping a cue field zooming the page on iOS with no way to zoom back out.

= 1.1.1 =
* Lock the chart while a song is playing: the song and part fields can no longer be edited mid-song, and open part settings collapse out of the way.
* Fix the screen flash tinting Safari's status bar and toolbar orange for the length of playback on iOS.
* Fix iOS zooming in on the chart when a text field is tapped, and never zooming back out.

= 1.1.0 =
* Add a screen flash: an optional full-screen flash on every beat, hard on the downbeat and dim on the rest, locked to the same clock as the click.
* Remember the click and flash toggles between visits.

= 1.0.2 =
* Fix printing in Safari: no more blank second page; the printed/PDF output now matches Chrome.

= 1.0.1 =
* Add a print view: use your browser's Print (Ctrl/Cmd+P) for a clean one-page chart of the song's arrangement.

= 1.0.0 =
* Initial release.
