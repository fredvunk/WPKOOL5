<?php
 /* Plugin name: testplugin
 Plugin URL: http://fredvunk.ikt.khk.ee/wordpress5/
 Description: This is the very first plugin I ever created.
 Version: 1.0
 Author: Fred Vunk
 Author URL: http://fredvunk.ikt.khk.ee/wordpress5/ */
 
function valentines_day() {
	        if (!is_admin()) {
	                wp_enqueue_script('valentines-day', WP_PLUGIN_URL . '/valentines-day/' . 'valentines-day.js', false, '1.41');
	        }
	}		add_action('init', 'valentines_day', 10);	
?>
