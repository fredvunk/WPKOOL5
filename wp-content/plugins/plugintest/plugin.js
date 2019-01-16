WordPress.org
Search WordPress.org for:
Search WordPress.org
Submit
Showcase
Themes
Plugins
Mobile
Support
Forums
Documentation
Get Involved
About
Blog
Hosting
Download WordPress
Plugin Directory

 
Login
Timeline
View Tickets
Browse Source
← Previous RevisionNext Revision →BlameRevision Log
source:valentines-day/trunk/valentines-day.js
View diff against: 
View revision:  
Last change on this file was 635242, checked in by svnlabs, 6 years ago
7 dec
File size: 17.1 KB
Line	 
1	/** @license
2	 * DHTML Snowstorm! JavaScript-based Snow for web pages
3	 * --------------------------------------------------------
4	 * Version 1.41.20101113 (Previous rev: 1.4.20091115)
5	 * Copyright (c) 2007, Scott Schiller. All rights reserved.
6	 * Code provided under the BSD License:
7	 * http://schillmania.com/projects/snowstorm/license.txt
8	 */
9	
10	/*global window, document, navigator, clearInterval, setInterval */
11	/*jslint white: false, onevar: true, plusplus: false, undef: true, nomen: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, immed: true */
12	
13	var snowStorm = (function(window, document) {
14	
15	  // --- common properties ---
16	 
17	 
18	
19	  this.flakesMax = 70;           // Limit total amount of snow made (falling + sticking)
20	  this.flakesMaxActive = 64;      // Limit amount of snow falling at once (less = lower CPU use)
21	  this.animationInterval = 100;    // Theoretical "miliseconds per frame" measurement. 20 = fast + smooth, but high CPU use. 50 = more conservative, but slower
22	  this.excludeMobile = true;      // Snow is likely to be bad news for mobile phones' CPUs (and batteries.) By default, be nice.
23	  this.flakeBottom = null;        // Integer for Y axis snow limit, 0 or null for "full-screen" snow effect
24	  this.followMouse = true;       // Snow movement can respond to the user's mouse
25	  this.snowColor = '#f00';        // Don't eat (or use?) yellow snow.
26	  this.snowCharacter = '&hearts;';  // &bull; = bullet, &middot; is square on some systems etc.
27	  this.snowStick = true;          // Whether or not snow should "stick" at the bottom. When off, will never collect.
28	  this.targetElement = null;      // element which snow will be appended to (null = document.body) - can be an element ID eg. 'myDiv', or a DOM node reference
29	  this.useMeltEffect = true;      // When recycling fallen snow (or rarely, when falling), have it "melt" and fade out if browser supports it
30	  this.useTwinkleEffect = true;  // Allow snow to randomly "flicker" in and out of view while falling
31	  this.usePositionFixed = true;  // true = snow does not shift vertically when scrolling. May increase CPU load, disabled by default - if enabled, used only where supported
32	
33	  // --- less-used bits ---
34	
35	  this.freezeOnBlur = true;       // Only snow when the window is in focus (foreground.) Saves CPU.
36	  this.flakeLeftOffset = 0;       // Left margin/gutter space on edge of container (eg. browser window.) Bump up these values if seeing horizontal scrollbars.
37	  this.flakeRightOffset = 0;      // Right margin/gutter space on edge of container
38	  this.flakeWidth = 15;            // Max pixel width reserved for snow element
39	  this.flakeHeight = 15;           // Max pixel height reserved for snow element
40	  this.vMaxX = 3;                 // Maximum X velocity range for snow
41	  this.vMaxY = 2;                 // Maximum Y velocity range for snow
42	  this.zIndex = 0;                // CSS stacking order applied to each snowflake
43	
44	  // --- End of user section ---
45	
46	  var s = this, storm = this, i,
47	  // UA sniffing and backCompat rendering mode checks for fixed position, etc.
48	  isIE = navigator.userAgent.match(/msie/i),
49	  isIE6 = navigator.userAgent.match(/msie 6/i),
50	  isWin98 = navigator.appVersion.match(/windows 98/i),
51	  isMobile = navigator.userAgent.match(/mobile/i),
52	  isBackCompatIE = (isIE && document.compatMode === 'BackCompat'),
53	  noFixed = (isMobile || isBackCompatIE || isIE6),
54	  screenX = null, screenX2 = null, screenY = null, scrollY = null, vRndX = null, vRndY = null,
55	  windOffset = 1,
56	  windMultiplier = 2,
57	  flakeTypes = 6,
58	  fixedForEverything = false,
59	  opacitySupported = (function(){
60	    try {
61	      document.createElement('div').style.opacity = '0.5';
62	    } catch(e) {
63	      return false;
64	    }
65	    return true;
66	  }()),
67	  didInit = false,
68	  docFrag = document.createDocumentFragment();
69	
70	  this.timers = [];
71	  this.flakes = [];
72	  this.disabled = false;
73	  this.active = false;
74	  this.meltFrameCount = 20;
75	  this.meltFrames = [];
76	
77	  this.events = (function() {
78	
79	    var old = (window.attachEvent), slice = Array.prototype.slice,
80	    evt = {
81	      add: (old?'attachEvent':'addEventListener'),
82	      remove: (old?'detachEvent':'removeEventListener')
83	    };
84	
85	    function getArgs(oArgs) {
86	      var args = slice.call(oArgs), len = args.length;
87	      if (old) {
88	        args[1] = 'on' + args[1]; // prefix
89	        if (len > 3) {
90	          args.pop(); // no capture
91	        }
92	      } else if (len === 3) {
93	        args.push(false);
94	      }
95	      return args;
96	    }
97	
98	    function apply(args, sType) {
99	      var oFunc = args.shift()[evt[sType]];
100	      if (old) {
101	        oFunc(args[0], args[1]);
102	      } else {
103	        oFunc.apply(this, args);
104	      }
105	    }
106	
107	    function addEvent() {
108	      apply(getArgs(arguments), 'add');
109	    }
110	
111	    function removeEvent() {
112	      apply(getArgs(arguments), 'remove');
113	    }
114	
115	    return {
116	      add: addEvent,
117	      remove: removeEvent
118	    };
119	
120	  }());
121	
122	  function rnd(n,min) {
123	    if (isNaN(min)) {
124	      min = 0;
125	    }
126	    return (Math.random()*n)+min;
127	  }
128	
129	  function plusMinus(n) {
130	    return (parseInt(rnd(2),10)===1?n*-1:n);
131	  }
132	
133	  this.randomizeWind = function() {
134	    vRndX = plusMinus(rnd(s.vMaxX,0.2));
135	    vRndY = rnd(s.vMaxY,0.2);
136	    if (this.flakes) {
137	      for (var i=0; i<this.flakes.length; i++) {
138	        if (this.flakes[i].active) {
139	          this.flakes[i].setVelocities();
140	        }
141	      }
142	    }
143	  };
144	
145	  this.scrollHandler = function() {
146	    // "attach" snowflakes to bottom of window if no absolute bottom value was given
147	    scrollY = (s.flakeBottom?0:parseInt(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop,10));
148	    if (isNaN(scrollY)) {
149	      scrollY = 0; // Netscape 6 scroll fix
150	    }
151	    if (!fixedForEverything && !s.flakeBottom && s.flakes) {
152	      for (var i=s.flakes.length; i--;) {
153	        if (s.flakes[i].active === 0) {
154	          s.flakes[i].stick();
155	        }
156	      }
157	    }
158	  };
159	
160	  this.resizeHandler = function() {
161	    if (window.innerWidth || window.innerHeight) {
162	      screenX = window.innerWidth-(!isIE?16:2)-s.flakeRightOffset;
163	      screenY = (s.flakeBottom?s.flakeBottom:window.innerHeight);
164	    } else {
165	      screenX = (document.documentElement.clientWidth||document.body.clientWidth||document.body.scrollWidth)-(!isIE?8:0)-s.flakeRightOffset;
166	      screenY = s.flakeBottom?s.flakeBottom:(document.documentElement.clientHeight||document.body.clientHeight||document.body.scrollHeight);
167	    }
168	    screenX2 = parseInt(screenX/2,10);
169	  };
170	
171	  this.resizeHandlerAlt = function() {
172	    screenX = s.targetElement.offsetLeft+s.targetElement.offsetWidth-s.flakeRightOffset;
173	    screenY = s.flakeBottom?s.flakeBottom:s.targetElement.offsetTop+s.targetElement.offsetHeight;
174	    screenX2 = parseInt(screenX/2,10);
175	  };
176	
177	  this.freeze = function() {
178	    // pause animation
179	    if (!s.disabled) {
180	      s.disabled = 1;
181	    } else {
182	      return false;
183	    }
184	    for (var i=s.timers.length; i--;) {
185	      clearInterval(s.timers[i]);
186	    }
187	  };
188	
189	  this.resume = function() {
190	    if (s.disabled) {
191	       s.disabled = 0;
192	    } else {
193	      return false;
194	    }
195	    s.timerInit();
196	  };
197	
198	  this.toggleSnow = function() {
199	    if (!s.flakes.length) {
200	      // first run
201	      s.start();
202	    } else {
203	      s.active = !s.active;
204	      if (s.active) {
205	        s.show();
206	        s.resume();
207	      } else {
208	        s.stop();
209	        s.freeze();
210	      }
211	    }
212	  };
213	
214	  this.stop = function() {
215	    this.freeze();
216	    for (var i=this.flakes.length; i--;) {
217	      this.flakes[i].o.style.display = 'none';
218	    }
219	    s.events.remove(window,'scroll',s.scrollHandler);
220	    s.events.remove(window,'resize',s.resizeHandler);
221	    if (s.freezeOnBlur) {
222	      if (isIE) {
223	        s.events.remove(document,'focusout',s.freeze);
224	        s.events.remove(document,'focusin',s.resume);
225	      } else {
226	        s.events.remove(window,'blur',s.freeze);
227	        s.events.remove(window,'focus',s.resume);
228	      }
229	    }
230	  };
231	
232	  this.show = function() {
233	    for (var i=this.flakes.length; i--;) {
234	      this.flakes[i].o.style.display = 'block';
235	    }
236	  };
237	
238	  this.SnowFlake = function(parent,type,x,y) {
239	    var s = this, storm = parent;
240	       
241	        var symbls = new Array('&hearts;','&#127801;', '&#127852;');
242	    var schar = symbls[Math.floor(Math.random() * symbls.length)];
243	       
244	        var sclrs = new Array('#ff0000','#2CAA47','#E8EF1F','#0080FF','#ffffff');
245	    var scolors = sclrs[Math.floor(Math.random() * sclrs.length)];
246	       
247	       
248	    this.type = type;
249	    this.x = x||parseInt(rnd(screenX-20),10);
250	    this.y = (!isNaN(y)?y:-rnd(screenY)-12);
251	    this.vX = null;
252	    this.vY = null;
253	    this.vAmpTypes = [1,1.2,1.4,1.6,1.8]; // "amplification" for vX/vY (based on flake size/type)
254	    this.vAmp = this.vAmpTypes[this.type];
255	    this.melting = false;
256	    this.meltFrameCount = storm.meltFrameCount;
257	    this.meltFrames = storm.meltFrames;
258	    this.meltFrame = 0;
259	    this.twinkleFrame = 0;
260	    this.active = 1;
261	    this.fontSize = (10+(this.type/5)*10);
262	    this.o = document.createElement('div');
263	    this.o.innerHTML = schar; /*storm.snowCharacter;*/
264	    this.o.style.color = scolors; /*storm.snowColor;*/
265	    this.o.style.position = (fixedForEverything?'fixed':'absolute');
266	    this.o.style.width = storm.flakeWidth+'px';
267	    this.o.style.height = storm.flakeHeight+'px';
268	    this.o.style.fontFamily = 'arial,verdana';
269	    this.o.style.overflow = 'hidden';
270	    this.o.style.fontWeight = 'normal';
271	    this.o.style.zIndex = storm.zIndex;
272	    docFrag.appendChild(this.o);
273	
274	    this.refresh = function() {
275	      if (isNaN(s.x) || isNaN(s.y)) {
276	        // safety check
277	        return false;
278	      }
279	      s.o.style.left = s.x+'px';
280	      s.o.style.top = s.y+'px';
281	    };
282	
283	    this.stick = function() {
284	      if (noFixed || (storm.targetElement !== document.documentElement && storm.targetElement !== document.body)) {
285	        s.o.style.top = (screenY+scrollY-storm.flakeHeight)+'px';
286	      } else if (storm.flakeBottom) {
287	        s.o.style.top = storm.flakeBottom+'px';
288	      } else {
289	        s.o.style.display = 'none';
290	        s.o.style.top = 'auto';
291	        s.o.style.bottom = '0px';
292	        s.o.style.position = 'fixed';
293	        s.o.style.display = 'block';
294	      }
295	    };
296	
297	    this.vCheck = function() {
298	      if (s.vX>=0 && s.vX<0.2) {
299	        s.vX = 0.2;
300	      } else if (s.vX<0 && s.vX>-0.2) {
301	        s.vX = -0.2;
302	      }
303	      if (s.vY>=0 && s.vY<0.2) {
304	        s.vY = 0.2;
305	      }
306	    };
307	
308	    this.move = function() {
309	      var vX = s.vX*windOffset, yDiff;
310	      s.x += vX;
311	      s.y += (s.vY*s.vAmp);
312	      if (s.x >= screenX || screenX-s.x < storm.flakeWidth) { // X-axis scroll check
313	        s.x = 0;
314	      } else if (vX < 0 && s.x-storm.flakeLeftOffset < 0-storm.flakeWidth) {
315	        s.x = screenX-storm.flakeWidth-1; // flakeWidth;
316	      }
317	      s.refresh();
318	      yDiff = screenY+scrollY-s.y;
319	      if (yDiff<storm.flakeHeight) {
320	        s.active = 0;
321	        if (storm.snowStick) {
322	          s.stick();
323	        } else {
324	          s.recycle();
325	        }
326	      } else {
327	        if (storm.useMeltEffect && s.active && s.type < 3 && !s.melting && Math.random()>0.998) {
328	          // ~1/1000 chance of melting mid-air, with each frame
329	          s.melting = true;
330	          s.melt();
331	          // only incrementally melt one frame
332	          // s.melting = false;
333	        }
334	        if (storm.useTwinkleEffect) {
335	          if (!s.twinkleFrame) {
336	            if (Math.random()>0.9) {
337	              s.twinkleFrame = parseInt(Math.random()*20,10);
338	            }
339	          } else {
340	            s.twinkleFrame--;
341	            s.o.style.visibility = (s.twinkleFrame && s.twinkleFrame%2===0?'hidden':'visible');
342	          }
343	        }
344	      }
345	    };
346	
347	    this.animate = function() {
348	      // main animation loop
349	      // move, check status, die etc.
350	      s.move();
351	    };
352	
353	    this.setVelocities = function() {
354	      s.vX = vRndX+rnd(storm.vMaxX*0.12,0.1);
355	      s.vY = vRndY+rnd(storm.vMaxY*0.12,0.1);
356	    };
357	
358	    this.setOpacity = function(o,opacity) {
359	      if (!opacitySupported) {
360	        return false;
361	      }
362	      o.style.opacity = opacity;
363	    };
364	
365	    this.melt = function() {
366	      if (!storm.useMeltEffect || !s.melting) {
367	        s.recycle();
368	      } else {
369	        if (s.meltFrame < s.meltFrameCount) {
370	          s.meltFrame++;
371	          s.setOpacity(s.o,s.meltFrames[s.meltFrame]);
372	          s.o.style.fontSize = s.fontSize-(s.fontSize*(s.meltFrame/s.meltFrameCount))+'px';
373	          s.o.style.lineHeight = storm.flakeHeight+2+(storm.flakeHeight*0.75*(s.meltFrame/s.meltFrameCount))+'px';
374	        } else {
375	          s.recycle();
376	        }
377	      }
378	    };
379	
380	    this.recycle = function() {
381	      s.o.style.display = 'none';
382	      s.o.style.position = (fixedForEverything?'fixed':'absolute');
383	      s.o.style.bottom = 'auto';
384	      s.setVelocities();
385	      s.vCheck();
386	      s.meltFrame = 0;
387	      s.melting = false;
388	      s.setOpacity(s.o,1);
389	      s.o.style.padding = '0px';
390	      s.o.style.margin = '0px';
391	      s.o.style.fontSize = s.fontSize+'px';
392	      s.o.style.lineHeight = (storm.flakeHeight+2)+'px';
393	      s.o.style.textAlign = 'center';
394	      s.o.style.verticalAlign = 'baseline';
395	      s.x = parseInt(rnd(screenX-storm.flakeWidth-20),10);
396	      s.y = parseInt(rnd(screenY)*-1,10)-storm.flakeHeight;
397	      s.refresh();
398	      s.o.style.display = 'block';
399	      s.active = 1;
400	    };
401	
402	    this.recycle(); // set up x/y coords etc.
403	    this.refresh();
404	
405	  };
406	
407	  this.snow = function() {
408	    var active = 0, used = 0, waiting = 0, flake = null, i;
409	    for (i=s.flakes.length; i--;) {
410	      if (s.flakes[i].active === 1) {
411	        s.flakes[i].move();
412	        active++;
413	      } else if (s.flakes[i].active === 0) {
414	        used++;
415	      } else {
416	        waiting++;
417	      }
418	      if (s.flakes[i].melting) {
419	        s.flakes[i].melt();
420	      }
421	    }
422	    if (active<s.flakesMaxActive) {
423	      flake = s.flakes[parseInt(rnd(s.flakes.length),10)];
424	      if (flake.active === 0) {
425	        flake.melting = true;
426	      }
427	    }
428	  };
429	
430	  this.mouseMove = function(e) {
431	    if (!s.followMouse) {
432	      return true;
433	    }
434	    var x = parseInt(e.clientX,10);
435	    if (x<screenX2) {
436	      windOffset = -windMultiplier+(x/screenX2*windMultiplier);
437	    } else {
438	      x -= screenX2;
439	      windOffset = (x/screenX2)*windMultiplier;
440	    }
441	  };
442	
443	  this.createSnow = function(limit,allowInactive) {
444	    for (var i=0; i<limit; i++) {
445	      s.flakes[s.flakes.length] = new s.SnowFlake(s,parseInt(rnd(flakeTypes),10));
446	      if (allowInactive || i>s.flakesMaxActive) {
447	        s.flakes[s.flakes.length-1].active = -1;
448	      }
449	    }
450	    storm.targetElement.appendChild(docFrag);
451	  };
452	
453	  this.timerInit = function() {
454	    s.timers = (!isWin98?[setInterval(s.snow,s.animationInterval)]:[setInterval(s.snow,s.animationInterval*3),setInterval(s.snow,s.animationInterval)]);
455	  };
456	
457	  this.init = function() {
458	    for (var i=0; i<s.meltFrameCount; i++) {
459	      s.meltFrames.push(1-(i/s.meltFrameCount));
460	    }
461	    s.randomizeWind();
462	    s.createSnow(s.flakesMax); // create initial batch
463	    s.events.add(window,'resize',s.resizeHandler);
464	    s.events.add(window,'scroll',s.scrollHandler);
465	    if (s.freezeOnBlur) {
466	      if (isIE) {
467	        s.events.add(document,'focusout',s.freeze);
468	        s.events.add(document,'focusin',s.resume);
469	      } else {
470	        s.events.add(window,'blur',s.freeze);
471	        s.events.add(window,'focus',s.resume);
472	      }
473	    }
474	    s.resizeHandler();
475	    s.scrollHandler();
476	    if (s.followMouse) {
477	      s.events.add(isIE?document:window,'mousemove',s.mouseMove);
478	    }
479	    s.animationInterval = Math.max(20,s.animationInterval);
480	    s.timerInit();
481	  };
482	
483	  this.start = function(bFromOnLoad) {
484	    if (!didInit) {
485	      didInit = true;
486	    } else if (bFromOnLoad) {
487	      // already loaded and running
488	      return true;
489	    }
490	    if (typeof s.targetElement === 'string') {
491	      var targetID = s.targetElement;
492	      s.targetElement = document.getElementById(targetID);
493	      if (!s.targetElement) {
494	        throw new Error('Snowstorm: Unable to get targetElement "'+targetID+'"');
495	      }
496	    }
497	    if (!s.targetElement) {
498	      s.targetElement = (!isIE?(document.documentElement?document.documentElement:document.body):document.body);
499	    }
500	    if (s.targetElement !== document.documentElement && s.targetElement !== document.body) {
501	      s.resizeHandler = s.resizeHandlerAlt; // re-map handler to get element instead of screen dimensions
502	    }
503	    s.resizeHandler(); // get bounding box elements
504	    s.usePositionFixed = (s.usePositionFixed && !noFixed); // whether or not position:fixed is supported
505	    fixedForEverything = s.usePositionFixed;
506	    if (screenX && screenY && !s.disabled) {
507	      s.init();
508	      s.active = true;
509	    }
510	  };
511	
512	  function doStart() {
513	    if ((this.excludeMobile && !isMobile) || !this.excludeMobile) {
514	      window.setTimeout(function() {
515	        s.start(true);
516	      }, 20);
517	    }
518	    // event cleanup
519	    s.events.remove(window, 'load', doStart);
520	  }
521	
522	  // hooks for starting the snow
523	  s.events.add(window, 'load', doStart, false);
524	
525	  return this;
526	
527	}(window, document));
Note: See TracBrowser for help on using the repository browser.
Trac UI Preferences
Download in other formats:
Plain Text Original Format
About
Blog
Hosting
Donate
Support
Developers
Get Involved
Learn
Showcase
Plugins
Themes
Ideas
WordCamp
WordPress.TV
BuddyPress
bbPress
WordPress.com
Matt
Privacy
License / GPLv2
CODE IS POETRY