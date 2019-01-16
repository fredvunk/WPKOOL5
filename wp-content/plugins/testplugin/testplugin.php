<?php
 /* Plugin name: testplugin
 Plugin URL: http://fredvunk.ikt.khk.ee/wordpress5/
 Description: This is the very first plugin I ever created.
 Version: 1.0
 Author: Fred Vunk
 Author URL: http://fredvunk.ikt.khk.ee/wordpress5/ */
 function dh_modify_read_more_link() {
 return '<a class="more-link" href="' . get_permalink() . '">Click to Read!</a>';
}
add_filter( 'the_content_more_link', 'dh_modify_read_more_link' );