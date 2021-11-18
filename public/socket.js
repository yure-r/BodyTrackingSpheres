const canvas = document.querySelector('#c');
  // const renderer = new THREE.WebGLRenderer({canvas});
const renderer = new THREE.WebGLRenderer( { canvas, alpha: true } ); // init like this
renderer.setClearColor( 0xffffff, 0 ); // second param is opacity, 0 => transparent
  let INTERSECTED = null
  const fov = 40;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 50000;

( function () {

	// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
	//
	//    Orbit - left mouse / touch: one-finger move
	//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
	//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

	const _changeEvent = {
		type: 'change'
	};
	const _startEvent = {
		type: 'start'
	};
	const _endEvent = {
		type: 'end'
	};

	class OrbitControls extends THREE.EventDispatcher {

		constructor( object, domElement ) {

			super();
			if ( domElement === undefined ) console.warn( 'THREE.OrbitControls: The second parameter "domElement" is now mandatory.' );
			if ( domElement === document ) console.error( 'THREE.OrbitControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.' );
			this.object = object;
			this.domElement = domElement; // Set to false to disable this control

			this.enabled = true; // "target" sets the location of focus, where the object orbits around

			this.target = new THREE.Vector3(); // How far you can dolly in and out ( PerspectiveCamera only )

			this.minDistance = 0;
			this.maxDistance = Infinity; // How far you can zoom in and out ( OrthographicCamera only )

			this.minZoom = 0;
			this.maxZoom = Infinity; // How far you can orbit vertically, upper and lower limits.
			// Range is 0 to Math.PI radians.

			this.minPolarAngle = 0; // radians

			this.maxPolarAngle = Math.PI; // radians
			// How far you can orbit horizontally, upper and lower limits.
			// If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )

			this.minAzimuthAngle = - Infinity; // radians

			this.maxAzimuthAngle = Infinity; // radians
			// Set to true to enable damping (inertia)
			// If damping is enabled, you must call controls.update() in your animation loop

			this.enableDamping = false;
			this.dampingFactor = 0.05; // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
			// Set to false to disable zooming

			this.enableZoom = true;
			this.zoomSpeed = 1.0; // Set to false to disable rotating

			this.enableRotate = true;
			this.rotateSpeed = 1.0; // Set to false to disable panning

			this.enablePan = true;
			this.panSpeed = 1.0;
			this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up

			this.keyPanSpeed = 7.0; // pixels moved per arrow key push
			// Set to true to automatically rotate around the target
			// If auto-rotate is enabled, you must call controls.update() in your animation loop

			this.autoRotate = false;
			this.autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60
			// The four arrow keys

			this.keys = {
				LEFT: 'ArrowLeft',
				UP: 'ArrowUp',
				RIGHT: 'ArrowRight',
				BOTTOM: 'ArrowDown'
			}; // Mouse buttons

			this.mouseButtons = {
				LEFT: THREE.MOUSE.ROTATE,
				MIDDLE: THREE.MOUSE.DOLLY,
				RIGHT: THREE.MOUSE.PAN
			}; // Touch fingers

			this.touches = {
				ONE: THREE.TOUCH.ROTATE,
				TWO: THREE.TOUCH.DOLLY_PAN
			}; // for reset

			this.target0 = this.target.clone();
			this.position0 = this.object.position.clone();
			this.zoom0 = this.object.zoom; // the target DOM element for key events

			this._domElementKeyEvents = null; //
			// public methods
			//

			this.getPolarAngle = function () {

				return spherical.phi;

			};

			this.getAzimuthalAngle = function () {

				return spherical.theta;

			};

			this.listenToKeyEvents = function ( domElement ) {

				domElement.addEventListener( 'keydown', onKeyDown );
				this._domElementKeyEvents = domElement;

			};

			this.saveState = function () {

				scope.target0.copy( scope.target );
				scope.position0.copy( scope.object.position );
				scope.zoom0 = scope.object.zoom;

			};

			this.reset = function () {

				scope.target.copy( scope.target0 );
				scope.object.position.copy( scope.position0 );
				scope.object.zoom = scope.zoom0;
				scope.object.updateProjectionMatrix();
				scope.dispatchEvent( _changeEvent );
				scope.update();
				state = STATE.NONE;

			}; // this method is exposed, but perhaps it would be better if we can make it private...


			this.update = function () {

				const offset = new THREE.Vector3(); // so camera.up is the orbit axis

				const quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
				const quatInverse = quat.clone().invert();
				const lastPosition = new THREE.Vector3();
				const lastQuaternion = new THREE.Quaternion();
				const twoPI = 2 * Math.PI;
				return function update() {

					const position = scope.object.position;
					offset.copy( position ).sub( scope.target ); // rotate offset to "y-axis-is-up" space

					offset.applyQuaternion( quat ); // angle from z-axis around y-axis

					spherical.setFromVector3( offset );

					if ( scope.autoRotate && state === STATE.NONE ) {

						rotateLeft( getAutoRotationAngle() );

					}

					if ( scope.enableDamping ) {

						spherical.theta += sphericalDelta.theta * scope.dampingFactor;
						spherical.phi += sphericalDelta.phi * scope.dampingFactor;

					} else {

						spherical.theta += sphericalDelta.theta;
						spherical.phi += sphericalDelta.phi;

					} // restrict theta to be between desired limits


					let min = scope.minAzimuthAngle;
					let max = scope.maxAzimuthAngle;

					if ( isFinite( min ) && isFinite( max ) ) {

						if ( min < - Math.PI ) min += twoPI; else if ( min > Math.PI ) min -= twoPI;
						if ( max < - Math.PI ) max += twoPI; else if ( max > Math.PI ) max -= twoPI;

						if ( min <= max ) {

							spherical.theta = Math.max( min, Math.min( max, spherical.theta ) );

						} else {

							spherical.theta = spherical.theta > ( min + max ) / 2 ? Math.max( min, spherical.theta ) : Math.min( max, spherical.theta );

						}

					} // restrict phi to be between desired limits


					spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );
					spherical.makeSafe();
					spherical.radius *= scale; // restrict radius to be between desired limits

					spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) ); // move target to panned location

					if ( scope.enableDamping === true ) {

						scope.target.addScaledVector( panOffset, scope.dampingFactor );

					} else {

						scope.target.add( panOffset );

					}

					offset.setFromSpherical( spherical ); // rotate offset back to "camera-up-vector-is-up" space

					offset.applyQuaternion( quatInverse );
					position.copy( scope.target ).add( offset );
					scope.object.lookAt( scope.target );

					if ( scope.enableDamping === true ) {

						sphericalDelta.theta *= 1 - scope.dampingFactor;
						sphericalDelta.phi *= 1 - scope.dampingFactor;
						panOffset.multiplyScalar( 1 - scope.dampingFactor );

					} else {

						sphericalDelta.set( 0, 0, 0 );
						panOffset.set( 0, 0, 0 );

					}

					scale = 1; // update condition is:
					// min(camera displacement, camera rotation in radians)^2 > EPS
					// using small-angle approximation cos(x/2) = 1 - x^2 / 8

					if ( zoomChanged || lastPosition.distanceToSquared( scope.object.position ) > EPS || 8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

						scope.dispatchEvent( _changeEvent );
						lastPosition.copy( scope.object.position );
						lastQuaternion.copy( scope.object.quaternion );
						zoomChanged = false;
						return true;

					}

					return false;

				};

			}();

			this.dispose = function () {

				scope.domElement.removeEventListener( 'contextmenu', onContextMenu );
				scope.domElement.removeEventListener( 'pointerdown', onPointerDown );
				scope.domElement.removeEventListener( 'wheel', onMouseWheel );
				scope.domElement.removeEventListener( 'touchstart', onTouchStart );
				scope.domElement.removeEventListener( 'touchend', onTouchEnd );
				scope.domElement.removeEventListener( 'touchmove', onTouchMove );
				scope.domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
				scope.domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

				if ( scope._domElementKeyEvents !== null ) {

					scope._domElementKeyEvents.removeEventListener( 'keydown', onKeyDown );

				} //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

			}; //
			// internals
			//


			const scope = this;
			const STATE = {
				NONE: - 1,
				ROTATE: 0,
				DOLLY: 1,
				PAN: 2,
				TOUCH_ROTATE: 3,
				TOUCH_PAN: 4,
				TOUCH_DOLLY_PAN: 5,
				TOUCH_DOLLY_ROTATE: 6
			};
			let state = STATE.NONE;
			const EPS = 0.000001; // current position in spherical coordinates

			const spherical = new THREE.Spherical();
			const sphericalDelta = new THREE.Spherical();
			let scale = 1;
			const panOffset = new THREE.Vector3();
			let zoomChanged = false;
			const rotateStart = new THREE.Vector2();
			const rotateEnd = new THREE.Vector2();
			const rotateDelta = new THREE.Vector2();
			const panStart = new THREE.Vector2();
			const panEnd = new THREE.Vector2();
			const panDelta = new THREE.Vector2();
			const dollyStart = new THREE.Vector2();
			const dollyEnd = new THREE.Vector2();
			const dollyDelta = new THREE.Vector2();

			function getAutoRotationAngle() {

				return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

			}

			function getZoomScale() {

				return Math.pow( 0.95, scope.zoomSpeed );

			}

			function rotateLeft( angle ) {

				sphericalDelta.theta -= angle;

			}

			function rotateUp( angle ) {

				sphericalDelta.phi -= angle;

			}

			const panLeft = function () {

				const v = new THREE.Vector3();
				return function panLeft( distance, objectMatrix ) {

					v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix

					v.multiplyScalar( - distance );
					panOffset.add( v );

				};

			}();

			const panUp = function () {

				const v = new THREE.Vector3();
				return function panUp( distance, objectMatrix ) {

					if ( scope.screenSpacePanning === true ) {

						v.setFromMatrixColumn( objectMatrix, 1 );

					} else {

						v.setFromMatrixColumn( objectMatrix, 0 );
						v.crossVectors( scope.object.up, v );

					}

					v.multiplyScalar( distance );
					panOffset.add( v );

				};

			}(); // deltaX and deltaY are in pixels; right and down are positive


			const pan = function () {

				const offset = new THREE.Vector3();
				return function pan( deltaX, deltaY ) {

					const element = scope.domElement;

					if ( scope.object.isPerspectiveCamera ) {

						// perspective
						const position = scope.object.position;
						offset.copy( position ).sub( scope.target );
						let targetDistance = offset.length(); // half of the fov is center to top of screen

						targetDistance *= Math.tan( scope.object.fov / 2 * Math.PI / 180.0 ); // we use only clientHeight here so aspect ratio does not distort speed

						panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
						panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

					} else if ( scope.object.isOrthographicCamera ) {

						// orthographic
						panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
						panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

					} else {

						// camera neither orthographic nor perspective
						console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
						scope.enablePan = false;

					}

				};

			}();

			function dollyOut( dollyScale ) {

				if ( scope.object.isPerspectiveCamera ) {

					scale /= dollyScale;

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
					scope.object.updateProjectionMatrix();
					zoomChanged = true;

				} else {

					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
					scope.enableZoom = false;

				}

			}

			function dollyIn( dollyScale ) {

				if ( scope.object.isPerspectiveCamera ) {

					scale *= dollyScale;

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
					scope.object.updateProjectionMatrix();
					zoomChanged = true;

				} else {

					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
					scope.enableZoom = false;

				}

			} //
			// event callbacks - update the object state
			//


			function handleMouseDownRotate( event ) {

				rotateStart.set( event.clientX, event.clientY );

			}

			function handleMouseDownDolly( event ) {

				dollyStart.set( event.clientX, event.clientY );

			}

			function handleMouseDownPan( event ) {

				panStart.set( event.clientX, event.clientY );

			}

			function handleMouseMoveRotate( event ) {

				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
				const element = scope.domElement;
				rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

				rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );
				rotateStart.copy( rotateEnd );
				scope.update();

			}

			function handleMouseMoveDolly( event ) {

				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					dollyOut( getZoomScale() );

				} else if ( dollyDelta.y < 0 ) {

					dollyIn( getZoomScale() );

				}

				dollyStart.copy( dollyEnd );
				scope.update();

			}

			function handleMouseMovePan( event ) {

				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
				pan( panDelta.x, panDelta.y );
				panStart.copy( panEnd );
				scope.update();

			}

			function handleMouseUp( ) { // no-op
			}

			function handleMouseWheel( event ) {

				if ( event.deltaY < 0 ) {

					dollyIn( getZoomScale() );

				} else if ( event.deltaY > 0 ) {

					dollyOut( getZoomScale() );

				}

				scope.update();

			}

			function handleKeyDown( event ) {

				let needsUpdate = false;

				switch ( event.code ) {

					case scope.keys.UP:
						pan( 0, scope.keyPanSpeed );
						needsUpdate = true;
						break;

					case scope.keys.BOTTOM:
						pan( 0, - scope.keyPanSpeed );
						needsUpdate = true;
						break;

					case scope.keys.LEFT:
						pan( scope.keyPanSpeed, 0 );
						needsUpdate = true;
						break;

					case scope.keys.RIGHT:
						pan( - scope.keyPanSpeed, 0 );
						needsUpdate = true;
						break;

				}

				if ( needsUpdate ) {

					// prevent the browser from scrolling on cursor keys
					event.preventDefault();
					scope.update();

				}

			}

			function handleTouchStartRotate( event ) {

				if ( event.touches.length == 1 ) {

					rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					rotateStart.set( x, y );

				}

			}

			function handleTouchStartPan( event ) {

				if ( event.touches.length == 1 ) {

					panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					panStart.set( x, y );

				}

			}

			function handleTouchStartDolly( event ) {

				const dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				const dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				const distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );

			}

			function handleTouchStartDollyPan( event ) {

				if ( scope.enableZoom ) handleTouchStartDolly( event );
				if ( scope.enablePan ) handleTouchStartPan( event );

			}

			function handleTouchStartDollyRotate( event ) {

				if ( scope.enableZoom ) handleTouchStartDolly( event );
				if ( scope.enableRotate ) handleTouchStartRotate( event );

			}

			function handleTouchMoveRotate( event ) {

				if ( event.touches.length == 1 ) {

					rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					rotateEnd.set( x, y );

				}

				rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
				const element = scope.domElement;
				rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

				rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );
				rotateStart.copy( rotateEnd );

			}

			function handleTouchMovePan( event ) {

				if ( event.touches.length == 1 ) {

					panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				} else {

					const x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
					const y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );
					panEnd.set( x, y );

				}

				panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
				pan( panDelta.x, panDelta.y );
				panStart.copy( panEnd );

			}

			function handleTouchMoveDolly( event ) {

				const dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				const dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				const distance = Math.sqrt( dx * dx + dy * dy );
				dollyEnd.set( 0, distance );
				dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );
				dollyOut( dollyDelta.y );
				dollyStart.copy( dollyEnd );

			}

			function handleTouchMoveDollyPan( event ) {

				if ( scope.enableZoom ) handleTouchMoveDolly( event );
				if ( scope.enablePan ) handleTouchMovePan( event );

			}

			function handleTouchMoveDollyRotate( event ) {

				if ( scope.enableZoom ) handleTouchMoveDolly( event );
				if ( scope.enableRotate ) handleTouchMoveRotate( event );

			}

			function handleTouchEnd( ) { // no-op
			} //
			// event handlers - FSM: listen for events and reset state
			//


			function onPointerDown( event ) {

				if ( scope.enabled === false ) return;

				switch ( event.pointerType ) {

					case 'mouse':
					case 'pen':
						onMouseDown( event );
						break;
        // TODO touch

				}

			}

			function onPointerMove( event ) {

				if ( scope.enabled === false ) return;

				switch ( event.pointerType ) {

					case 'mouse':
					case 'pen':
						onMouseMove( event );
						break;
        // TODO touch

				}

			}

			function onPointerUp( event ) {

				switch ( event.pointerType ) {

					case 'mouse':
					case 'pen':
						onMouseUp( event );
						break;
        // TODO touch

				}

			}

			function onMouseDown( event ) {

				// Prevent the browser from scrolling.
				event.preventDefault(); // Manually set the focus since calling preventDefault above
				// prevents the browser from setting it automatically.

				scope.domElement.focus ? scope.domElement.focus() : window.focus();
				let mouseAction;

				switch ( event.button ) {

					case 0:
						mouseAction = scope.mouseButtons.LEFT;
						break;

					case 1:
						mouseAction = scope.mouseButtons.MIDDLE;
						break;

					case 2:
						mouseAction = scope.mouseButtons.RIGHT;
						break;

					default:
						mouseAction = - 1;

				}

				switch ( mouseAction ) {

					case THREE.MOUSE.DOLLY:
						if ( scope.enableZoom === false ) return;
						handleMouseDownDolly( event );
						state = STATE.DOLLY;
						break;

					case THREE.MOUSE.ROTATE:
						if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

							if ( scope.enablePan === false ) return;
							handleMouseDownPan( event );
							state = STATE.PAN;

						} else {

							if ( scope.enableRotate === false ) return;
							handleMouseDownRotate( event );
							state = STATE.ROTATE;

						}

						break;

					case THREE.MOUSE.PAN:
						if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

							if ( scope.enableRotate === false ) return;
							handleMouseDownRotate( event );
							state = STATE.ROTATE;

						} else {

							if ( scope.enablePan === false ) return;
							handleMouseDownPan( event );
							state = STATE.PAN;

						}

						break;

					default:
						state = STATE.NONE;

				}

				if ( state !== STATE.NONE ) {

					scope.domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove );
					scope.domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp );
					scope.dispatchEvent( _startEvent );

				}

			}

			function onMouseMove( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault();

				switch ( state ) {

					case STATE.ROTATE:
						if ( scope.enableRotate === false ) return;
						handleMouseMoveRotate( event );
						break;

					case STATE.DOLLY:
						if ( scope.enableZoom === false ) return;
						handleMouseMoveDolly( event );
						break;

					case STATE.PAN:
						if ( scope.enablePan === false ) return;
						handleMouseMovePan( event );
						break;

				}

			}

			function onMouseUp( event ) {

				scope.domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
				scope.domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );
				if ( scope.enabled === false ) return;
				handleMouseUp( event );
				scope.dispatchEvent( _endEvent );
				state = STATE.NONE;

			}

			function onMouseWheel( event ) {

				if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE ) return;
				event.preventDefault();
				scope.dispatchEvent( _startEvent );
				handleMouseWheel( event );
				scope.dispatchEvent( _endEvent );

			}

			function onKeyDown( event ) {

				if ( scope.enabled === false || scope.enablePan === false ) return;
				handleKeyDown( event );

			}

			function onTouchStart( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault(); // prevent scrolling

				switch ( event.touches.length ) {

					case 1:
						switch ( scope.touches.ONE ) {

							case THREE.TOUCH.ROTATE:
								if ( scope.enableRotate === false ) return;
								handleTouchStartRotate( event );
								state = STATE.TOUCH_ROTATE;
								break;

							case THREE.TOUCH.PAN:
								if ( scope.enablePan === false ) return;
								handleTouchStartPan( event );
								state = STATE.TOUCH_PAN;
								break;

							default:
								state = STATE.NONE;

						}

						break;

					case 2:
						switch ( scope.touches.TWO ) {

							case THREE.TOUCH.DOLLY_PAN:
								if ( scope.enableZoom === false && scope.enablePan === false ) return;
								handleTouchStartDollyPan( event );
								state = STATE.TOUCH_DOLLY_PAN;
								break;

							case THREE.TOUCH.DOLLY_ROTATE:
								if ( scope.enableZoom === false && scope.enableRotate === false ) return;
								handleTouchStartDollyRotate( event );
								state = STATE.TOUCH_DOLLY_ROTATE;
								break;

							default:
								state = STATE.NONE;

						}

						break;

					default:
						state = STATE.NONE;

				}

				if ( state !== STATE.NONE ) {

					scope.dispatchEvent( _startEvent );

				}

			}

			function onTouchMove( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault(); // prevent scrolling

				switch ( state ) {

					case STATE.TOUCH_ROTATE:
						if ( scope.enableRotate === false ) return;
						handleTouchMoveRotate( event );
						scope.update();
						break;

					case STATE.TOUCH_PAN:
						if ( scope.enablePan === false ) return;
						handleTouchMovePan( event );
						scope.update();
						break;

					case STATE.TOUCH_DOLLY_PAN:
						if ( scope.enableZoom === false && scope.enablePan === false ) return;
						handleTouchMoveDollyPan( event );
						scope.update();
						break;

					case STATE.TOUCH_DOLLY_ROTATE:
						if ( scope.enableZoom === false && scope.enableRotate === false ) return;
						handleTouchMoveDollyRotate( event );
						scope.update();
						break;

					default:
						state = STATE.NONE;

				}

			}

			function onTouchEnd( event ) {

				if ( scope.enabled === false ) return;
				handleTouchEnd( event );
				scope.dispatchEvent( _endEvent );
				state = STATE.NONE;

			}

			function onContextMenu( event ) {

				if ( scope.enabled === false ) return;
				event.preventDefault();

			} //


			scope.domElement.addEventListener( 'contextmenu', onContextMenu );
			scope.domElement.addEventListener( 'pointerdown', onPointerDown );
			scope.domElement.addEventListener( 'wheel', onMouseWheel, {
				passive: false
			} );
			scope.domElement.addEventListener( 'touchstart', onTouchStart, {
				passive: false
			} );
			scope.domElement.addEventListener( 'touchend', onTouchEnd );
			scope.domElement.addEventListener( 'touchmove', onTouchMove, {
				passive: false
			} ); // force an update at start

			this.update();

		}

	} // This set of controls performs orbiting, dollying (zooming), and panning.
	// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
	// This is very similar to OrbitControls, another set of touch behavior
	//
	//    Orbit - right mouse, or left mouse + ctrl/meta/shiftKey / touch: two-finger rotate
	//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
	//    Pan - left mouse, or arrow keys / touch: one-finger move


	class MapControls extends OrbitControls {

		constructor( object, domElement ) {

			super( object, domElement );
			this.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up

			this.mouseButtons.LEFT = THREE.MOUSE.PAN;
			this.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
			this.touches.ONE = THREE.TOUCH.PAN;
			this.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

		}

	}

	THREE.MapControls = MapControls;
	THREE.OrbitControls = OrbitControls;
  window.OrbitControls = OrbitControls

} )();

  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  				const renderwidth = window.innerWidth;
				  const renderheight = window.innerHeight;
  renderer.setSize( renderwidth, renderheight );
  camera.position.set(-200, -20, 40);
var camera_pivot = new THREE.Object3D()
var Y_AXIS = new THREE.Vector3( 0, 1, 0 );
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');
scene.add( camera_pivot );
camera_pivot.add( camera );
camera.position.set( -100, -10, 0 );
camera.lookAt( camera_pivot.position );

  const controls = new window.OrbitControls(camera, canvas);
  
  // controls.target.set(300, 302, 300);
  controls.target.set(0, -10, 0)
  // controls.enableZoom = false;
  
  // controls.enableDamping = true;
      controls.enableDamping = true;   //damping 
    controls.dampingFactor = 0.25;   //damping inertia
    controls.enableZoom = true;      //Zooming
  controls.maxZoom = 1;
    controls.autoRotate = true;       // enable rotation
    controls.maxPolarAngle = Math.PI / 2; // Limit angle of visibility
  
  
  controls.update();

  function addLight(position) {
    const color = 0xFFFFFF;
    
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
    scene.add(light.target);
  }
  // addLight([-3, 1, 1]);
  // addLight([ 2, 1, .5]);


  const bodyRadiusTop = .2;
  const bodyRadiusBottom = .2;
  const bodyHeight = 2;
  const bodyRadialSegments = 0;
  // const bodyGeometry = new THREE.BoxGeometry(
  //     bodyRadiusTop, bodyRadiusBottom, bodyHeight, bodyRadialSegments);
 // const bodyGeometry = new THREE.BoxGeometry(
 //      1, 1, 1);

  const headRadius = bodyRadiusTop * 0.8;
  const headLonSegments = 0;
  const headLatSegments = 0;
  // const headGeometry = new THREE.BoxGeometry(
  //     headRadius, headLonSegments, headLatSegments);

// const headGeometry = new THREE.BoxGeometry(
//       1, 1, 1);

  
  
  function makeLabelCanvas(baseWidth, size, name) {
    const borderSize = 2;
    const ctx = document.createElement('canvas').getContext('2d');
    const font =  `${size}px bold sans`;
    ctx.font = font;
    // measure how long the name will be
    const textWidth = ctx.measureText(name).width;

    const doubleBorderSize = borderSize * 2;
    const width = baseWidth + doubleBorderSize;
    const height = size + doubleBorderSize;
    ctx.canvas.width = width;
    ctx.canvas.height = height;

    // need to set font again after resizing canvas
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, height);

    // scale to fit but don't stretch
    const scaleFactor = Math.min(1, baseWidth / textWidth);
    ctx.translate(width / 2, height / 2);
    ctx.scale(scaleFactor, 1);
    ctx.fillStyle = 'gray';
    ctx.fillText(name, 0, 0);

    return ctx.canvas;
  }

  function makePerson(x, y, z, labelWidth, size, name, color, scale, scale1) {
    const canvas = makeLabelCanvas(labelWidth, size, name);
    const texture = new THREE.CanvasTexture(canvas);
  
  // const bodyRadiusTop = scale;
    const bodyRadiusTop = 0.4;
  // const headRadius = bodyRadiusTop;
    // console.log(scale1)
     const headRadius = scale1/1.5;
  const headLonSegments = 0;
  const headLatSegments = 0;
  // const headGeometry = new THREE.BoxGeometry(
  //     headRadius, headLonSegments, headLatSegments);
      const headGeometry = new THREE.BoxGeometry(
      0.5, 0.5, 0.5);
    
    // const texture = new THREE.TextureLoader().load( "https://cdn.glitch.com/7c03a55c-a72e-40b1-be05-9b9c1089e3c9%2Ffinal%20svgs-41.svg?v=1608090608703" );
    
    // because our canvas is likely not a power of 2
    // in both dimensions set the filtering appropriately.
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    

    const labelMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    //388 and 888
    var color1 = z-388
    var colorpercent1 = color1/5
    // console.log("COLOR%", colorpercent1) 
    var colorcolor = colorpercent1+200
    // console.log("Z", z);
    if (color === "purple" || "red"){
      colorcolor = 240
    }
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 'hsl(100,100%,0%)',
      flatShading: true,
      visible: true,
      transparent: true,
      opacity: 1,
      emissive: 'hsl(100,100%,0%)',
      emissiveIntensity: 2,
      specular: false, 
      shininess: 0
    });
    
    // bodyMaterial.color.setHSL(colorcolor, 100, 50);
    // console.log(bodyMaterial.color)
    
    const root = new THREE.Object3D();
    root.position.x = x;
    root.position.z = y;
    root.position.y = z;
//  const gltfLoader = new GLTFLoader();
//     const body = gltfLoader.load('https://cdn.glitch.com/cd468695-c59f-4c0b-9d20-eebcf72be1c8%2Ftimecapsulecapsule.glb?v=1616445343656', (gltf) => {
//       const root = gltf.scene;
//       // root.name = "4"
//       // group.add(root);

//       // compute the box that contains all the stuff
//       // from root and below
//       const box = new THREE.Box3().setFromObject(root);

//       const boxSize = box.getSize(new THREE.Vector3()).length();
//       const boxCenter = box.getCenter(new THREE.Vector3());

// //       // set the camera to frame the box
// //       // frameArea(boxSize * 0.5, boxSize, boxCenter, camera);

// //       // update the Trackball controls to handle the new size
// //       controls.maxDistance = boxSize * 10;
// //       controls.target.copy(boxCenter);
// //       controls.update();

//     });
//       scene.add(body)
//     // body.position.y = bodyHeight / 2;
const map = new THREE.TextureLoader().load( 'https://cdn.glitch.me/3972d6f4-892b-4df1-adda-0da6e2ddf320%2Fblackcircle.png' );
const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff } );
// const sprite = new THREE.Sprite( material );
    
    // const head = new THREE.Mesh(headGeometry, bodyMaterial);
     const head = new THREE.Sprite( material );
    head.scale.set(0.5, 0.5, 0.5)
    
    head.name = name
    root.add(head);
    head.position.y = 1 + headRadius * 1.1;
const material2 = new THREE.LineBasicMaterial({
	color: 0x000000
});

const points = [];
points.push( new THREE.Vector3( x, 0, z ) );
points.push( new THREE.Vector3( x, head.position.y, z ) );

const geometry2 = new THREE.BufferGeometry().setFromPoints( points );

const line = new THREE.Line( geometry2, material2 );
    line.name = name + "_line"
    
scene.add( line );

    const label = new THREE.Sprite(labelMaterial);
    label.name = name
    root.add(label);
    label.position.y = head.position.y * 4 / 5;
    label.position.z = bodyRadiusTop * 1.01;

    // if units are meters then 0.01 here makes size
    // of the label into centimeters.
    const labelBaseScale = 0.01;
    label.scale.x = canvas.width  * labelBaseScale;
    label.scale.y = canvas.height * labelBaseScale;

    scene.add(root);
    // console.log(scene)
    return root;
  }
// x, y, z, labelWidth, size, name, color, scale, scale1
// myObject.name = "objectName";
let r = 7;
































//   makePerson( 15, 0, 0, 150, 32, 'HEAD', 'red',0.5 ,0.5);
//   makePerson( 18, 0, 0, 150, 32, 'NOSE', 'red',0.5 ,0.5);

//   makePerson( 13, 0, 0, 150, 32, 'NECK', 'red',0.5 ,0.5);

//   makePerson( 19, 2, 0, 150, 32, 'EYE_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 19, -2, 0, 150, 32, 'EYE_LEFT', 'red',0.5 ,0.5);

//   makePerson( 19, 4, 0, 150, 32, 'EAR_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 19, -4, 0, 150, 32, 'EAR_LEFT', 'red',0.5 ,0.5);


//   makePerson( 9, 0, 0, 150, 32, 'SPINE_CHEST', 'red',0.5 ,0.5);

//   makePerson( 3, 0, 0, 150, 32, 'SPINE_NAVAL', 'red',0.5 ,0.5);

//   makePerson( -3, 0, 0, 150, 32, 'PELVIS', 'red',0.5 ,0.5);


//   makePerson( 14, 8, 0, 150, 32, 'CLAVICLE_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 14, -8, 0, 150, 32, 'CLAVICLE_LEFT', 'red',0.5 ,0.5);

//   makePerson( 13, 10, 0, 150, 32, 'SHOULDER_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 13, -10, 0, 150, 32, 'SHOULDER_LEFT', 'red',0.5 ,0.5);

//   makePerson( 12, 13, 0, 150, 32, 'ELBOW_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 12, -13, 0, 150, 32, 'ELBOW_LEFT', 'red',0.5 ,0.5);

//   makePerson( 11, 15, 0, 150, 32, 'WRIST_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 11, -15, 0, 150, 32, 'WRIST_LEFT', 'red',0.5 ,0.5);

//   makePerson( 11, 16, 0, 150, 32, 'HAND_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 11, -16, 0, 150, 32, 'HAND_LEFT', 'red',0.5 ,0.5);

//   makePerson( 11, 20, 0, 150, 32, 'HANDTIP_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 11, -20, 0, 150, 32, 'HANDTIP_LEFT', 'red',0.5 ,0.5);

//   makePerson( 11, 18, 0, 150, 32, 'THUMB_RIGHT', 'red',0.5 ,0.5);
//   makePerson( 11, -18, 0, 150, 32, 'THUMB_LEFT', 'red',0.5 ,0.5);

//   makePerson( -5, 4, 0, 150, 32, 'HIP_RIGHT', 'red',0.5 ,0.5);
//   makePerson( -5, -4, 0, 150, 32, 'HIP_LEFT', 'red',0.5 ,0.5);

//   makePerson( -7, 4, 0, 150, 32, 'KNEE_RIGHT', 'red',0.5 ,0.5);
//   makePerson( -7, -4, 0, 150, 32, 'KNEE_LEFT', 'red',0.5 ,0.5);

//   makePerson( -9, 4, 0, 150, 32, 'ANKLE_RIGHT', 'red',0.5 ,0.5);
//   makePerson( -9, -4, 0, 150, 32, 'ANKLE_LEFT', 'red',0.5 ,0.5);

//   makePerson( -11, 4, 0, 150, 32, 'FOOT_RIGHT', 'red',0.5 ,0.5);
//   makePerson( -11, -4, 0, 150, 32, 'FOOT_LEFT', 'red',0.5 ,0.5);



  makePerson( 0, 0, 0, 150, 32, 'HEAD', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'NOSE', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'NECK', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'EYE_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'EYE_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'EAR_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'EAR_LEFT', 'red',0.5 ,0.5);


  makePerson( 0, 0, 0, 150, 32, 'SPINE_CHEST', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'SPINE_NAVAL', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'PELVIS', 'red',0.5 ,0.5);


  makePerson( 0, 0, 0, 150, 32, 'CLAVICLE_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'CLAVICLE_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'SHOULDER_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'SHOULDER_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'ELBOW_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'ELBOW_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'WRIST_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'WRIST_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'HAND_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'HAND_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'HANDTIP_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'HANDTIP_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'THUMB_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'THUMB_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'HIP_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'HIP_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'KNEE_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'KNEE_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'ANKLE_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'ANKLE_LEFT', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT', 'red',0.5 ,0.5);

  //////////////////////////////
  makePerson( 0, 0, 0, 150, 32, 'ANKLE_LEFT_PAD', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'KNEE_LEFT_PAD', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'HIP_LEFT_PAD', 'red',0.5 ,0.5);

  makePerson( 0, 0, 0, 150, 32, 'ANKLE_RIGHT_PAD', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'KNEE_RIGHT_PAD', 'red',0.5 ,0.5);
  makePerson( 0, 0, 0, 150, 32, 'HIP_RIGHT_PAD', 'red',0.5 ,0.5);
/////////////////////////////////////
makePerson( 0, 0, 0, 150, 32, 'HAND_HANDTIP_RIGHT_PAD', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'HAND_HANDTIP_LEFT_PAD', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'HANDTIP_THUMB_RIGHT_PAD', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'HANDTIP_THUMB_LEFT_PAD', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'THUMB_HANDTIP_HAND_RIGHT_PAD', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'THUMB_HANDTIP_HAND_LEFT_PAD', 'red',0.5 ,0.5);
////////////////////
makePerson( 0, 0, 0, 150, 32, 'NECK_EAR_CLAVICLE_RIGHT_PAD', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'NECK_EAR_CLAVICLE_LEFT_PAD', 'red',0.5 ,0.5);
////////////
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM_4', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP_4', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM_5', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP_5', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_BOTTOM_6', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_LEFT_PAD_EDGE_TOP_6', 'red',0.5 ,0.5);
////////////////
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM_4', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP_4', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM_5', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP_5', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_BOTTOM_6', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'FOOT_RIGHT_PAD_EDGE_TOP_6', 'red',0.5 ,0.5);

makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_TOP_PAD_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_TOP_PAD_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_TOP_PAD_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_TOP_PAD_4', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_BOTTOM_PAD_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_BOTTOM_PAD_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_BOTTOM_PAD_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_LEFT_BOTTOM_PAD_4', 'red',0.5 ,0.5);

makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_TOP_PAD_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_TOP_PAD_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_TOP_PAD_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_TOP_PAD_4', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_BOTTOM_PAD_1', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_BOTTOM_PAD_2', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_BOTTOM_PAD_3', 'red',0.5 ,0.5);
makePerson( 0, 0, 0, 150, 32, 'ARM_RIGHT_BOTTOM_PAD_4', 'red',0.5 ,0.5);

  const correction = 10
  
  var HEAD = scene.getObjectByName('HEAD');
  console.log(HEAD)
  HEAD.position.x = 16 - correction
  HEAD.position.z = 0
  var NOSE = scene.getObjectByName('NOSE');
  NOSE.position.x = 18 - correction
  NOSE.position.z = 0
  var NECK = scene.getObjectByName('NECK');
  NECK.position.x = 14 - correction
  NECK.position.z = 0
  var EYE_RIGHT = scene.getObjectByName('EYE_RIGHT');
  EYE_RIGHT.position.x = 18 - correction
  EYE_RIGHT.position.z = 2
  var EYE_LEFT = scene.getObjectByName('EYE_LEFT');
  EYE_LEFT.position.x = 18 - correction
  EYE_LEFT.position.z = -2
  var EAR_RIGHT = scene.getObjectByName('EAR_RIGHT');
  EAR_RIGHT.position.x = 16 - correction
  EAR_RIGHT.position.z = 2
  var EAR_LEFT = scene.getObjectByName('EAR_LEFT');
  EAR_LEFT.position.x = 16 - correction
  EAR_LEFT.position.z = -2
  var SPINE_CHEST = scene.getObjectByName('SPINE_CHEST');
  SPINE_CHEST.position.x = 12 - correction
  SPINE_CHEST.position.z = 0
  var SPINE_NAVAL = scene.getObjectByName('SPINE_NAVAL');
  SPINE_NAVAL.position.x = 10 - correction
  SPINE_NAVAL.position.z = 0
  var PELVIS = scene.getObjectByName('PELVIS');
  PELVIS.position.x = 8 - correction
  PELVIS.position.z = 0
  var CLAVICLE_RIGHT = scene.getObjectByName('CLAVICLE_RIGHT');
  CLAVICLE_RIGHT.position.x = 14 - correction
  CLAVICLE_RIGHT.position.z = 4
  var CLAVICLE_LEFT = scene.getObjectByName('CLAVICLE_LEFT');
  CLAVICLE_LEFT.position.x = 14 - correction
  CLAVICLE_LEFT.position.z = -4
  var SHOULDER_RIGHT = scene.getObjectByName('SHOULDER_RIGHT');
  SHOULDER_RIGHT.position.x = 14 - correction
  SHOULDER_RIGHT.position.z = 6
  var SHOULDER_LEFT = scene.getObjectByName('SHOULDER_LEFT');
  SHOULDER_LEFT.position.x = 14 - correction
  SHOULDER_LEFT.position.z =  -6
  var ELBOW_RIGHT = scene.getObjectByName('ELBOW_RIGHT');
  ELBOW_RIGHT.position.x = 14 - correction
  ELBOW_RIGHT.position.z = 8
  var ELBOW_LEFT = scene.getObjectByName('ELBOW_LEFT');
  ELBOW_LEFT.position.x = 14 - correction
  ELBOW_LEFT.position.z =  -8
  var WRIST_RIGHT = scene.getObjectByName('WRIST_RIGHT');
  WRIST_RIGHT.position.x = 14 - correction
  WRIST_RIGHT.position.z = 10
  var WRIST_LEFT = scene.getObjectByName('WRIST_LEFT');
  WRIST_LEFT.position.x = 14 - correction
  WRIST_LEFT.position.z =  -10
  var HAND_RIGHT = scene.getObjectByName('HAND_RIGHT');
  HAND_RIGHT.position.x = 14 - correction
  HAND_RIGHT.position.z = 12
  var HAND_LEFT = scene.getObjectByName('HAND_LEFT');
  HAND_LEFT.position.x = 14 - correction
  HAND_LEFT.position.z =  -12
  var THUMB_RIGHT = scene.getObjectByName('THUMB_RIGHT');
  THUMB_RIGHT.position.x = 18 - correction
  THUMB_RIGHT.position.z = 12
  var THUMB_LEFT = scene.getObjectByName('THUMB_LEFT');
  THUMB_LEFT.position.x = 18 - correction
  THUMB_LEFT.position.z =  -12
  var HANDTIP_RIGHT = scene.getObjectByName('HANDTIP_RIGHT');
  HANDTIP_RIGHT.position.x = 16 - correction
  HANDTIP_RIGHT.position.z = 14
  var HANDTIP_LEFT = scene.getObjectByName('HANDTIP_LEFT');
  HANDTIP_LEFT.position.x = 16 - correction
  HANDTIP_LEFT.position.z = -14
  var HIP_RIGHT = scene.getObjectByName('HIP_RIGHT');
  HIP_RIGHT.position.x = 8 - correction
  HIP_RIGHT.position.z = 2
  var HIP_LEFT = scene.getObjectByName('HIP_LEFT');
  HIP_LEFT.position.x = 8 - correction
  HIP_LEFT.position.z = -2
  var KNEE_RIGHT = scene.getObjectByName('KNEE_RIGHT');
  KNEE_RIGHT.position.x = 8 - correction
  KNEE_RIGHT.position.z = 6
  var KNEE_LEFT = scene.getObjectByName('KNEE_LEFT');
  KNEE_LEFT.position.x = 8 - correction
  KNEE_LEFT.position.z = -6
  var ANKLE_RIGHT = scene.getObjectByName('ANKLE_RIGHT');
  ANKLE_RIGHT.position.x = 8 - correction
  ANKLE_RIGHT.position.z = 10
  var ANKLE_LEFT = scene.getObjectByName('ANKLE_LEFT');
  ANKLE_LEFT.position.x = 8 - correction
  ANKLE_LEFT.position.z = -10
////////////////////////////////////////////////////////////////
var ANKLE_LEFT_PAD = scene.getObjectByName('ANKLE_LEFT_PAD')
ANKLE_LEFT_PAD.position.x = 8 - correction
ANKLE_LEFT_PAD.position.z = -12
var ANKLE_RIGHT_PAD = scene.getObjectByName('ANKLE_RIGHT_PAD')
ANKLE_RIGHT_PAD.position.x = 8 - correction
ANKLE_RIGHT_PAD.position.z = 12
var KNEE_LEFT_PAD = scene.getObjectByName('KNEE_LEFT_PAD')
KNEE_LEFT_PAD.position.x = 8 - correction
KNEE_LEFT_PAD.position.z = -8
var KNEE_RIGHT_PAD = scene.getObjectByName('KNEE_RIGHT_PAD')
KNEE_RIGHT_PAD.position.x = 8 - correction
KNEE_RIGHT_PAD.position.z = 8
var HIP_LEFT_PAD = scene.getObjectByName('HIP_LEFT_PAD')
HIP_LEFT_PAD.position.x = 8 - correction
HIP_LEFT_PAD.position.z = -4
var HIP_RIGHT_PAD = scene.getObjectByName('HIP_RIGHT_PAD')
HIP_RIGHT_PAD.position.x = 8 - correction
HIP_RIGHT_PAD.position.z = 4
//////////////////////////////////////////////////////////////////
var HAND_HANDTIP_RIGHT_PAD = scene.getObjectByName('HAND_HANDTIP_RIGHT_PAD')
HAND_HANDTIP_RIGHT_PAD.position.x = 14 - correction
HAND_HANDTIP_RIGHT_PAD.position.z = 14
var HAND_HANDTIP_LEFT_PAD = scene.getObjectByName('HAND_HANDTIP_LEFT_PAD')
HAND_HANDTIP_LEFT_PAD.position.x = 14 - correction
HAND_HANDTIP_LEFT_PAD.position.z = -14
var HANDTIP_THUMB_RIGHT_PAD = scene.getObjectByName('HANDTIP_THUMB_RIGHT_PAD')
HANDTIP_THUMB_RIGHT_PAD.position.x = 18 - correction
HANDTIP_THUMB_RIGHT_PAD.position.z = 14
var HANDTIP_THUMB_LEFT_PAD = scene.getObjectByName('HANDTIP_THUMB_LEFT_PAD')
HANDTIP_THUMB_LEFT_PAD.position.x = 18 - correction
HANDTIP_THUMB_LEFT_PAD.position.z = -14
var THUMB_HANDTIP_HAND_RIGHT_PAD = scene.getObjectByName('THUMB_HANDTIP_HAND_RIGHT_PAD')
THUMB_HANDTIP_HAND_RIGHT_PAD.position.x = 16 - correction
THUMB_HANDTIP_HAND_RIGHT_PAD.position.z = 12
var THUMB_HANDTIP_HAND_LEFT_PAD = scene.getObjectByName('THUMB_HANDTIP_HAND_LEFT_PAD')
THUMB_HANDTIP_HAND_LEFT_PAD.position.x = 16 - correction
THUMB_HANDTIP_HAND_LEFT_PAD.position.z = -12
/////////////////////////////////////////////////////////////////////
var NECK_EAR_CLAVICLE_RIGHT_PAD = scene.getObjectByName('NECK_EAR_CLAVICLE_RIGHT_PAD')
NECK_EAR_CLAVICLE_RIGHT_PAD.position.x = 14 - correction
NECK_EAR_CLAVICLE_RIGHT_PAD.position.z = 2
var NECK_EAR_CLAVICLE_LEFT_PAD = scene.getObjectByName('NECK_EAR_CLAVICLE_LEFT_PAD')
NECK_EAR_CLAVICLE_LEFT_PAD.position.x = 14 - correction
NECK_EAR_CLAVICLE_LEFT_PAD.position.z = -2
////////////////////////////////////////////////////////////////////// LEFT LEG PADS
var FOOT_LEFT_PAD_EDGE_BOTTOM = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM')
FOOT_LEFT_PAD_EDGE_BOTTOM.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM.position.z = -14
var FOOT_LEFT_PAD_EDGE_TOP = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP')
FOOT_LEFT_PAD_EDGE_TOP.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP.position.z = -14
var FOOT_LEFT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_1')
FOOT_LEFT_PAD_EDGE_BOTTOM_1.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_1.position.z = -12
var FOOT_LEFT_PAD_EDGE_TOP_1 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_1')
FOOT_LEFT_PAD_EDGE_TOP_1.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_1.position.z = -12
var FOOT_LEFT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_2')
FOOT_LEFT_PAD_EDGE_BOTTOM_2.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_2.position.z = -10
var FOOT_LEFT_PAD_EDGE_TOP_2 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_2')
FOOT_LEFT_PAD_EDGE_TOP_2.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_2.position.z = -10
var FOOT_LEFT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_3')
FOOT_LEFT_PAD_EDGE_BOTTOM_3.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_3.position.z = -8
var FOOT_LEFT_PAD_EDGE_TOP_3 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_3')
FOOT_LEFT_PAD_EDGE_TOP_3.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_3.position.z = -8
var FOOT_LEFT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_4')
FOOT_LEFT_PAD_EDGE_BOTTOM_4.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_4.position.z = -6
var FOOT_LEFT_PAD_EDGE_TOP_4 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_4')
FOOT_LEFT_PAD_EDGE_TOP_4.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_4.position.z = -6
var FOOT_LEFT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_5')
FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.z = -4
var FOOT_LEFT_PAD_EDGE_TOP_5 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_5')
FOOT_LEFT_PAD_EDGE_TOP_5.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_5.position.z = -4
var FOOT_LEFT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_6')
FOOT_LEFT_PAD_EDGE_BOTTOM_6.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_6.position.z = -2
var FOOT_LEFT_PAD_EDGE_TOP_6 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_6')
FOOT_LEFT_PAD_EDGE_TOP_6.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_6.position.z = -2
////////////////



////////////////////////////////////////////////////////////////////// LEFT ARM PADS


var ARM_LEFT_TOP_PAD_1 = scene.getObjectByName('ARM_LEFT_TOP_PAD_1')
ARM_LEFT_TOP_PAD_1.position.x = 18 - correction
ARM_LEFT_TOP_PAD_1.position.z = -10
var ARM_LEFT_TOP_PAD_2 = scene.getObjectByName('ARM_LEFT_TOP_PAD_2')
ARM_LEFT_TOP_PAD_2.position.x = 18 - correction
ARM_LEFT_TOP_PAD_2.position.z = -8
var ARM_LEFT_TOP_PAD_3 = scene.getObjectByName('ARM_LEFT_TOP_PAD_3')
ARM_LEFT_TOP_PAD_3.position.x = 18 - correction
ARM_LEFT_TOP_PAD_3.position.z = -6
var ARM_LEFT_TOP_PAD_4 = scene.getObjectByName('ARM_LEFT_TOP_PAD_4')
ARM_LEFT_TOP_PAD_4.position.x = 18 - correction
ARM_LEFT_TOP_PAD_4.position.z =-4
var ARM_LEFT_BOTTOM_PAD_1 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_1')
ARM_LEFT_BOTTOM_PAD_1.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_1.position.z = -10
var ARM_LEFT_BOTTOM_PAD_2 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_2')
ARM_LEFT_BOTTOM_PAD_2.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_2.position.z = -8
var ARM_LEFT_BOTTOM_PAD_3 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_3')
ARM_LEFT_BOTTOM_PAD_3.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_3.position.z = -6
var ARM_LEFT_BOTTOM_PAD_4 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_4')
ARM_LEFT_BOTTOM_PAD_4.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_4.position.z = -4


/////////////////////////////////////////////////////////////////////// RIGHT LEG PADS

var FOOT_RIGHT_PAD_EDGE_BOTTOM = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM')
FOOT_RIGHT_PAD_EDGE_BOTTOM.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM.position.z = 14
var FOOT_RIGHT_PAD_EDGE_TOP = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP')
FOOT_RIGHT_PAD_EDGE_TOP.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP.position.z = 14
var FOOT_RIGHT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_1')
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.position.z = 12
var FOOT_RIGHT_PAD_EDGE_TOP_1 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_1')
FOOT_RIGHT_PAD_EDGE_TOP_1.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_1.position.z = 12
var FOOT_RIGHT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_2')
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.position.z = 10
var FOOT_RIGHT_PAD_EDGE_TOP_2 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_2')
FOOT_RIGHT_PAD_EDGE_TOP_2.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_2.position.z = 10
var FOOT_RIGHT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_3')
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.position.z = 8
var FOOT_RIGHT_PAD_EDGE_TOP_3 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_3')
FOOT_RIGHT_PAD_EDGE_TOP_3.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_3.position.z = 8
var FOOT_RIGHT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_4')
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.position.z = 6
var FOOT_RIGHT_PAD_EDGE_TOP_4 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_4')
FOOT_RIGHT_PAD_EDGE_TOP_4.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_4.position.z = 6
var FOOT_RIGHT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_5')
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.z = 4
var FOOT_RIGHT_PAD_EDGE_TOP_5 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_5')
FOOT_RIGHT_PAD_EDGE_TOP_5.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_5.position.z = 4
var FOOT_RIGHT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_6')
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.position.z = 2
var FOOT_RIGHT_PAD_EDGE_TOP_6 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_6')
FOOT_RIGHT_PAD_EDGE_TOP_6.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_6.position.z = 2



////////////////////////////////////////////////////////////////////// RIGHT ARM PADS


var ARM_RIGHT_TOP_PAD_1 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_1')
ARM_RIGHT_TOP_PAD_1.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_1.position.z = 10
var ARM_RIGHT_TOP_PAD_2 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_2')
ARM_RIGHT_TOP_PAD_2.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_2.position.z = 8
var ARM_RIGHT_TOP_PAD_3 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_3')
ARM_RIGHT_TOP_PAD_3.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_3.position.z = 6
var ARM_RIGHT_TOP_PAD_4 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_4')
ARM_RIGHT_TOP_PAD_4.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_4.position.z = 4
var ARM_RIGHT_BOTTOM_PAD_1 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_1')
ARM_RIGHT_BOTTOM_PAD_1.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_1.position.z = 10
var ARM_RIGHT_BOTTOM_PAD_2 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_2')
ARM_RIGHT_BOTTOM_PAD_2.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_2.position.z = 8
var ARM_RIGHT_BOTTOM_PAD_3 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_3')
ARM_RIGHT_BOTTOM_PAD_3.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_3.position.z = 6
var ARM_RIGHT_BOTTOM_PAD_4 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_4')
ARM_RIGHT_BOTTOM_PAD_4.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_4.position.z = 4
/////////////
var FOOT_RIGHT = scene.getObjectByName('FOOT_RIGHT');
FOOT_RIGHT.position.x = 8 - correction
FOOT_RIGHT.position.z = 14
var FOOT_LEFT = scene.getObjectByName('FOOT_LEFT');
FOOT_LEFT.position.x = 8 - correction
FOOT_LEFT.position.z = -14

///////////////////////////////////////////////////////////////////////////////////////////////

  // var HEAD = scene.getObjectByName('HEAD');
  console.log(HEAD)
  HEAD.parent.children[1].position.x = 16 - correction
  HEAD.parent.children[1].position.z = 0
  // var NOSE = scene.getObjectByName('NOSE');
  NOSE.parent.children[1].position.x = 18 - correction
  NOSE.parent.children[1].position.z = 0
  // var NECK = scene.getObjectByName('NECK');
  NECK.parent.children[1].position.x = 14 - correction
  NECK.parent.children[1].position.z = 0
  // var EYE_RIGHT = scene.getObjectByName('EYE_RIGHT');
  EYE_RIGHT.parent.children[1].position.x = 18 - correction
  EYE_RIGHT.parent.children[1].position.z = 2
  // var EYE_LEFT = scene.getObjectByName('EYE_LEFT');
  EYE_LEFT.parent.children[1].position.x = 18 - correction
  EYE_LEFT.parent.children[1].position.z = -2
  // var EAR_RIGHT = scene.getObjectByName('EAR_RIGHT');
  EAR_RIGHT.parent.children[1].position.x = 16 - correction
  EAR_RIGHT.parent.children[1].position.z = 2
  // var EAR_LEFT = scene.getObjectByName('EAR_LEFT');
  EAR_LEFT.parent.children[1].position.x = 16 - correction
  EAR_LEFT.parent.children[1].position.z = -2
  // var SPINE_CHEST = scene.getObjectByName('SPINE_CHEST');
  SPINE_CHEST.parent.children[1].position.x = 12 - correction
  SPINE_CHEST.parent.children[1].position.z = 0
  // var SPINE_NAVAL = scene.getObjectByName('SPINE_NAVAL');
  SPINE_NAVAL.parent.children[1].position.x = 10 - correction
  SPINE_NAVAL.parent.children[1].position.z = 0
  // var PELVIS = scene.getObjectByName('PELVIS');
  PELVIS.parent.children[1].position.x = 8 - correction
  PELVIS.parent.children[1].position.z = 0
  // var CLAVICLE_RIGHT = scene.getObjectByName('CLAVICLE_RIGHT');
  CLAVICLE_RIGHT.parent.children[1].position.x = 14 - correction
  CLAVICLE_RIGHT.parent.children[1].position.z = 4
  // var CLAVICLE_LEFT = scene.getObjectByName('CLAVICLE_LEFT');
  CLAVICLE_LEFT.parent.children[1].position.x = 14 - correction
  CLAVICLE_LEFT.parent.children[1].position.z = -4
  // var SHOULDER_RIGHT = scene.getObjectByName('SHOULDER_RIGHT');
  SHOULDER_RIGHT.parent.children[1].position.x = 14 - correction
  SHOULDER_RIGHT.parent.children[1].position.z = 6
  // var SHOULDER_LEFT = scene.getObjectByName('SHOULDER_LEFT');
  SHOULDER_LEFT.parent.children[1].position.x = 14 - correction
  SHOULDER_LEFT.parent.children[1].position.z =  -6
  // var ELBOW_RIGHT = scene.getObjectByName('ELBOW_RIGHT');
  ELBOW_RIGHT.parent.children[1].position.x = 14 - correction
  ELBOW_RIGHT.parent.children[1].position.z = 8
  // var ELBOW_LEFT = scene.getObjectByName('ELBOW_LEFT');
  ELBOW_LEFT.parent.children[1].position.x = 14 - correction
  ELBOW_LEFT.parent.children[1].position.z =  -8
  // var WRIST_RIGHT = scene.getObjectByName('WRIST_RIGHT');
  WRIST_RIGHT.parent.children[1].position.x = 14 - correction
  WRIST_RIGHT.parent.children[1].position.z = 10
  // var WRIST_LEFT = scene.getObjectByName('WRIST_LEFT');
  WRIST_LEFT.parent.children[1].position.x = 14 - correction
  WRIST_LEFT.parent.children[1].position.z =  -10
  // var HAND_RIGHT = scene.getObjectByName('HAND_RIGHT');
  HAND_RIGHT.parent.children[1].position.x = 14 - correction
  HAND_RIGHT.parent.children[1].position.z = 12
  // var HAND_LEFT = scene.getObjectByName('HAND_LEFT');
  HAND_LEFT.parent.children[1].position.x = 14 - correction
  HAND_LEFT.parent.children[1].position.z =  -12
  // var THUMB_RIGHT = scene.getObjectByName('THUMB_RIGHT');
  THUMB_RIGHT.parent.children[1].position.x = 18 - correction
  THUMB_RIGHT.parent.children[1].position.z = 12
  // var THUMB_LEFT = scene.getObjectByName('THUMB_LEFT');
  THUMB_LEFT.parent.children[1].position.x = 18 - correction
  THUMB_LEFT.parent.children[1].position.z =  -12
  // var HANDTIP_RIGHT = scene.getObjectByName('HANDTIP_RIGHT');
  HANDTIP_RIGHT.parent.children[1].position.x = 16 - correction
  HANDTIP_RIGHT.parent.children[1].position.z = 14
  // var HANDTIP_LEFT = scene.getObjectByName('HANDTIP_LEFT');
  HANDTIP_LEFT.parent.children[1].position.x = 16 - correction
  HANDTIP_LEFT.parent.children[1].position.z = -14
  // var HIP_RIGHT = scene.getObjectByName('HIP_RIGHT');
  HIP_RIGHT.parent.children[1].position.x = 8 - correction
  HIP_RIGHT.parent.children[1].position.z = 2
  // var HIP_LEFT = scene.getObjectByName('HIP_LEFT');
  HIP_LEFT.parent.children[1].position.x = 8 - correction
  HIP_LEFT.parent.children[1].position.z = -2
  // var KNEE_RIGHT = scene.getObjectByName('KNEE_RIGHT');
  KNEE_RIGHT.parent.children[1].position.x = 8 - correction
  KNEE_RIGHT.parent.children[1].position.z = 6
  // var KNEE_LEFT = scene.getObjectByName('KNEE_LEFT');
  KNEE_LEFT.parent.children[1].position.x = 8 - correction
  KNEE_LEFT.parent.children[1].position.z = -6
  // var ANKLE_RIGHT = scene.getObjectByName('ANKLE_RIGHT');
  ANKLE_RIGHT.parent.children[1].position.x = 8 - correction
  ANKLE_RIGHT.parent.children[1].position.z = 10
  // var ANKLE_LEFT = scene.getObjectByName('ANKLE_LEFT');
  ANKLE_LEFT.parent.children[1].position.x = 8 - correction
  ANKLE_LEFT.parent.children[1].position.z = -10
////////////////////////////////////////////////////////////////
// var ANKLE_LEFT_PAD = scene.getObjectByName('ANKLE_LEFT_PAD')
ANKLE_LEFT_PAD.parent.children[1].position.x = 8 - correction
ANKLE_LEFT_PAD.parent.children[1].position.z = -12
// var ANKLE_RIGHT_PAD = scene.getObjectByName('ANKLE_RIGHT_PAD')
ANKLE_RIGHT_PAD.parent.children[1].position.x = 8 - correction
ANKLE_RIGHT_PAD.parent.children[1].position.z = 12
// var KNEE_LEFT_PAD = scene.getObjectByName('KNEE_LEFT_PAD')
KNEE_LEFT_PAD.parent.children[1].position.x = 8 - correction
KNEE_LEFT_PAD.parent.children[1].position.z = -8
// var KNEE_RIGHT_PAD = scene.getObjectByName('KNEE_RIGHT_PAD')
KNEE_RIGHT_PAD.parent.children[1].position.x = 8 - correction
KNEE_RIGHT_PAD.parent.children[1].position.z = 8
// var HIP_LEFT_PAD = scene.getObjectByName('HIP_LEFT_PAD')
HIP_LEFT_PAD.parent.children[1].position.x = 8 - correction
HIP_LEFT_PAD.parent.children[1].position.z = -4
// var HIP_RIGHT_PAD = scene.getObjectByName('HIP_RIGHT_PAD')
HIP_RIGHT_PAD.parent.children[1].position.x = 8 - correction
HIP_RIGHT_PAD.parent.children[1].position.z = 4
//////////////////////////////////////////////////////////////////
// var HAND_HANDTIP_RIGHT_PAD = scene.getObjectByName('HAND_HANDTIP_RIGHT_PAD')
HAND_HANDTIP_RIGHT_PAD.parent.children[1].position.x = 14 - correction
HAND_HANDTIP_RIGHT_PAD.parent.children[1].position.z = 14
// var HAND_HANDTIP_LEFT_PAD = scene.getObjectByName('HAND_HANDTIP_LEFT_PAD')
HAND_HANDTIP_LEFT_PAD.parent.children[1].position.x = 14 - correction
HAND_HANDTIP_LEFT_PAD.parent.children[1].position.z = -14
// var HANDTIP_THUMB_RIGHT_PAD = scene.getObjectByName('HANDTIP_THUMB_RIGHT_PAD')
HANDTIP_THUMB_RIGHT_PAD.parent.children[1].position.x = 18 - correction
HANDTIP_THUMB_RIGHT_PAD.parent.children[1].position.z = 14
// var HANDTIP_THUMB_LEFT_PAD = scene.getObjectByName('HANDTIP_THUMB_LEFT_PAD')
HANDTIP_THUMB_LEFT_PAD.parent.children[1].position.x = 18 - correction
HANDTIP_THUMB_LEFT_PAD.parent.children[1].position.z = -14
// var THUMB_HANDTIP_HAND_RIGHT_PAD = scene.getObjectByName('THUMB_HANDTIP_HAND_RIGHT_PAD')
THUMB_HANDTIP_HAND_RIGHT_PAD.parent.children[1].position.x = 16 - correction
THUMB_HANDTIP_HAND_RIGHT_PAD.parent.children[1].position.z = 12
// var THUMB_HANDTIP_HAND_LEFT_PAD = scene.getObjectByName('THUMB_HANDTIP_HAND_LEFT_PAD')
THUMB_HANDTIP_HAND_LEFT_PAD.parent.children[1].position.x = 16 - correction
THUMB_HANDTIP_HAND_LEFT_PAD.parent.children[1].position.z = -12
/////////////////////////////////////////////////////////////////////
// var NECK_EAR_CLAVICLE_RIGHT_PAD = scene.getObjectByName('NECK_EAR_CLAVICLE_RIGHT_PAD')
NECK_EAR_CLAVICLE_RIGHT_PAD.parent.children[1].position.x = 14 - correction
NECK_EAR_CLAVICLE_RIGHT_PAD.parent.children[1].position.z = 2
// var NECK_EAR_CLAVICLE_LEFT_PAD = scene.getObjectByName('NECK_EAR_CLAVICLE_LEFT_PAD')
NECK_EAR_CLAVICLE_LEFT_PAD.parent.children[1].position.x = 14 - correction
NECK_EAR_CLAVICLE_LEFT_PAD.parent.children[1].position.z = -2
////////////////////////////////////////////////////////////////////// LEFT LEG PADS
// var FOOT_LEFT_PAD_EDGE_BOTTOM = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM')
FOOT_LEFT_PAD_EDGE_BOTTOM.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM.parent.children[1].position.z = -14
// var FOOT_LEFT_PAD_EDGE_TOP = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP')
FOOT_LEFT_PAD_EDGE_TOP.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP.parent.children[1].position.z = -14
// var FOOT_LEFT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_1')
FOOT_LEFT_PAD_EDGE_BOTTOM_1.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_1.parent.children[1].position.z = -12
// var FOOT_LEFT_PAD_EDGE_TOP_1 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_1')
FOOT_LEFT_PAD_EDGE_TOP_1.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_1.parent.children[1].position.z = -12
// var FOOT_LEFT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_2')
FOOT_LEFT_PAD_EDGE_BOTTOM_2.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_2.parent.children[1].position.z = -10
// var FOOT_LEFT_PAD_EDGE_TOP_2 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_2')
FOOT_LEFT_PAD_EDGE_TOP_2.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_2.parent.children[1].position.z = -10
// var FOOT_LEFT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_3')
FOOT_LEFT_PAD_EDGE_BOTTOM_3.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_3.parent.children[1].position.z = -8
// var FOOT_LEFT_PAD_EDGE_TOP_3 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_3')
FOOT_LEFT_PAD_EDGE_TOP_3.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_3.parent.children[1].position.z = -8
// var FOOT_LEFT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_4')
FOOT_LEFT_PAD_EDGE_BOTTOM_4.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_4.parent.children[1].position.z = -6
// var FOOT_LEFT_PAD_EDGE_TOP_4 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_4')
FOOT_LEFT_PAD_EDGE_TOP_4.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_4.parent.children[1].position.z = -6
// var FOOT_LEFT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_5')
FOOT_LEFT_PAD_EDGE_BOTTOM_5.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_5.parent.children[1].position.z = -4
// var FOOT_LEFT_PAD_EDGE_TOP_5 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_5')
FOOT_LEFT_PAD_EDGE_TOP_5.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_5.parent.children[1].position.z = -4
// var FOOT_LEFT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_6')
FOOT_LEFT_PAD_EDGE_BOTTOM_6.parent.children[1].position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_6.parent.children[1].position.z = -2
// var FOOT_LEFT_PAD_EDGE_TOP_6 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_6')
FOOT_LEFT_PAD_EDGE_TOP_6.parent.children[1].position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_6.parent.children[1].position.z = -2
////////////////



////////////////////////////////////////////////////////////////////// LEFT ARM PADS


// var ARM_LEFT_TOP_PAD_1 = scene.getObjectByName('ARM_LEFT_TOP_PAD_1')
ARM_LEFT_TOP_PAD_1.parent.children[1].position.x = 18 - correction
ARM_LEFT_TOP_PAD_1.parent.children[1].position.z = -10
// var ARM_LEFT_TOP_PAD_2 = scene.getObjectByName('ARM_LEFT_TOP_PAD_2')
ARM_LEFT_TOP_PAD_2.parent.children[1].position.x = 18 - correction
ARM_LEFT_TOP_PAD_2.parent.children[1].position.z = -8
// var ARM_LEFT_TOP_PAD_3 = scene.getObjectByName('ARM_LEFT_TOP_PAD_3')
ARM_LEFT_TOP_PAD_3.parent.children[1].position.x = 18 - correction
ARM_LEFT_TOP_PAD_3.parent.children[1].position.z = -6
// var ARM_LEFT_TOP_PAD_4 = scene.getObjectByName('ARM_LEFT_TOP_PAD_4')
ARM_LEFT_TOP_PAD_4.parent.children[1].position.x = 18 - correction
ARM_LEFT_TOP_PAD_4.parent.children[1].position.z =-4
// var ARM_LEFT_BOTTOM_PAD_1 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_1')
ARM_LEFT_BOTTOM_PAD_1.parent.children[1].position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_1.parent.children[1].position.z = -10
// var ARM_LEFT_BOTTOM_PAD_2 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_2')
ARM_LEFT_BOTTOM_PAD_2.parent.children[1].position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_2.parent.children[1].position.z = -8
// var ARM_LEFT_BOTTOM_PAD_3 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_3')
ARM_LEFT_BOTTOM_PAD_3.parent.children[1].position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_3.parent.children[1].position.z = -6
// var ARM_LEFT_BOTTOM_PAD_4 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_4')
ARM_LEFT_BOTTOM_PAD_4.parent.children[1].position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_4.parent.children[1].position.z = -4


/////////////////////////////////////////////////////////////////////// RIGHT LEG PADS

// var FOOT_RIGHT_PAD_EDGE_BOTTOM = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM')
FOOT_RIGHT_PAD_EDGE_BOTTOM.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM.parent.children[1].position.z = 14
// var FOOT_RIGHT_PAD_EDGE_TOP = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP')
FOOT_RIGHT_PAD_EDGE_TOP.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP.parent.children[1].position.z = 14
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_1')
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.parent.children[1].position.z = 12
// var FOOT_RIGHT_PAD_EDGE_TOP_1 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_1')
FOOT_RIGHT_PAD_EDGE_TOP_1.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_1.parent.children[1].position.z = 12
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_2')
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.parent.children[1].position.z = 10
// var FOOT_RIGHT_PAD_EDGE_TOP_2 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_2')
FOOT_RIGHT_PAD_EDGE_TOP_2.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_2.parent.children[1].position.z = 10
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_3')
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.parent.children[1].position.z = 8
// var FOOT_RIGHT_PAD_EDGE_TOP_3 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_3')
FOOT_RIGHT_PAD_EDGE_TOP_3.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_3.parent.children[1].position.z = 8
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_4')
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.parent.children[1].position.z = 6
// var FOOT_RIGHT_PAD_EDGE_TOP_4 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_4')
FOOT_RIGHT_PAD_EDGE_TOP_4.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_4.parent.children[1].position.z = 6
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_5')
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.parent.children[1].position.z = 4
// var FOOT_RIGHT_PAD_EDGE_TOP_5 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_5')
FOOT_RIGHT_PAD_EDGE_TOP_5.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_5.parent.children[1].position.z = 4
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_6')
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.parent.children[1].position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.parent.children[1].position.z = 2
// var FOOT_RIGHT_PAD_EDGE_TOP_6 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_6')
FOOT_RIGHT_PAD_EDGE_TOP_6.parent.children[1].position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_6.parent.children[1].position.z = 2



////////////////////////////////////////////////////////////////////// RIGHT ARM PADS


// var ARM_RIGHT_TOP_PAD_1 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_1')
ARM_RIGHT_TOP_PAD_1.parent.children[1].position.x = 18 - correction
ARM_RIGHT_TOP_PAD_1.parent.children[1].position.z = 10
// var ARM_RIGHT_TOP_PAD_2 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_2')
ARM_RIGHT_TOP_PAD_2.parent.children[1].position.x = 18 - correction
ARM_RIGHT_TOP_PAD_2.parent.children[1].position.z = 8
// var ARM_RIGHT_TOP_PAD_3 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_3')
ARM_RIGHT_TOP_PAD_3.parent.children[1].position.x = 18 - correction
ARM_RIGHT_TOP_PAD_3.parent.children[1].position.z = 6
// var ARM_RIGHT_TOP_PAD_4 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_4')
ARM_RIGHT_TOP_PAD_4.parent.children[1].position.x = 18 - correction
ARM_RIGHT_TOP_PAD_4.parent.children[1].position.z = 4
// var ARM_RIGHT_BOTTOM_PAD_1 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_1')
ARM_RIGHT_BOTTOM_PAD_1.parent.children[1].position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_1.parent.children[1].position.z = 10
// var ARM_RIGHT_BOTTOM_PAD_2 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_2')
ARM_RIGHT_BOTTOM_PAD_2.parent.children[1].position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_2.parent.children[1].position.z = 8
// var ARM_RIGHT_BOTTOM_PAD_3 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_3')
ARM_RIGHT_BOTTOM_PAD_3.parent.children[1].position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_3.parent.children[1].position.z = 6
// var ARM_RIGHT_BOTTOM_PAD_4 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_4')
ARM_RIGHT_BOTTOM_PAD_4.parent.children[1].position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_4.parent.children[1].position.z = 4
/////////////
// var FOOT_RIGHT = scene.getObjectByName('FOOT_RIGHT');
FOOT_RIGHT.parent.children[1].position.x = 8 - correction
FOOT_RIGHT.parent.children[1].position.z = 14
// var FOOT_LEFT = scene.getObjectByName('FOOT_LEFT');
FOOT_LEFT.parent.children[1].position.x = 8 - correction
FOOT_LEFT.parent.children[1].position.z = -14





///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES


  var HEAD_LINE = scene.getObjectByName('HEAD_line');
  console.log(HEAD)
  HEAD_LINE.position.x = 16 - correction
  HEAD_LINE.position.z = 0
  var NOSE_LINE = scene.getObjectByName('NOSE_line');
  NOSE_LINE.position.x = 18 - correction
  NOSE_LINE.position.z = 0
  var NECK_LINE = scene.getObjectByName('NECK_line');
  NECK_LINE.position.x = 14 - correction
  NECK_LINE.position.z = 0
  var EYE_RIGHT_LINE = scene.getObjectByName('EYE_RIGHT_line');
  EYE_RIGHT_LINE.position.x = 18 - correction
  EYE_RIGHT_LINE.position.z = 2
  var EYE_LEFT_LINE = scene.getObjectByName('EYE_LEFT_line');
  EYE_LEFT_LINE.position.x = 18 - correction
  EYE_LEFT_LINE.position.z = -2
  var EAR_RIGHT_LINE = scene.getObjectByName('EAR_RIGHT_line');
  EAR_RIGHT_LINE.position.x = 16 - correction
  EAR_RIGHT_LINE.position.z = 2
  var EAR_LEFT_LINE = scene.getObjectByName('EAR_LEFT_line');
  EAR_LEFT_LINE.position.x = 16 - correction
  EAR_LEFT_LINE.position.z = -2
  var SPINE_CHEST_LINE = scene.getObjectByName('SPINE_CHEST_line');
  SPINE_CHEST_LINE.position.x = 12 - correction
  SPINE_CHEST_LINE.position.z = 0
  var SPINE_NAVAL_LINE = scene.getObjectByName('SPINE_NAVAL_line');
  SPINE_NAVAL_LINE.position.x = 10 - correction
  SPINE_NAVAL_LINE.position.z = 0
  var PELVIS_LINE = scene.getObjectByName('PELVIS_line');
  PELVIS_LINE.position.x = 8 - correction
  PELVIS_LINE.position.z = 0
  var CLAVICLE_RIGHT_LINE = scene.getObjectByName('CLAVICLE_RIGHT_line');
  CLAVICLE_RIGHT_LINE.position.x = 14 - correction
  CLAVICLE_RIGHT_LINE.position.z = 4
  var CLAVICLE_LEFT_LINE = scene.getObjectByName('CLAVICLE_LEFT_line');
  CLAVICLE_LEFT_LINE.position.x = 14 - correction
  CLAVICLE_LEFT_LINE.position.z = -4
  var SHOULDER_RIGHT_LINE = scene.getObjectByName('SHOULDER_RIGHT_line');
  SHOULDER_RIGHT_LINE.position.x = 14 - correction
  SHOULDER_RIGHT_LINE.position.z = 6
  var SHOULDER_LEFT_LINE = scene.getObjectByName('SHOULDER_LEFT_line');
  SHOULDER_LEFT_LINE.position.x = 14 - correction
  SHOULDER_LEFT_LINE.position.z =  -6
  var ELBOW_RIGHT_LINE = scene.getObjectByName('ELBOW_RIGHT_line');
  ELBOW_RIGHT_LINE.position.x = 14 - correction
  ELBOW_RIGHT_LINE.position.z = 8
  var ELBOW_LEFT_LINE = scene.getObjectByName('ELBOW_LEFT_line');
  ELBOW_LEFT_LINE.position.x = 14 - correction
  ELBOW_LEFT_LINE.position.z =  -8
  var WRIST_RIGHT_LINE = scene.getObjectByName('WRIST_RIGHT_line');
  WRIST_RIGHT_LINE.position.x = 14 - correction
  WRIST_RIGHT_LINE.position.z = 10
  var WRIST_LEFT_LINE = scene.getObjectByName('WRIST_LEFT_line');
  WRIST_LEFT_LINE.position.x = 14 - correction
  WRIST_LEFT_LINE.position.z =  -10
  var HAND_RIGHT_LINE = scene.getObjectByName('HAND_RIGHT_line');
  HAND_RIGHT_LINE.position.x = 14 - correction
  HAND_RIGHT_LINE.position.z = 12
  var HAND_LEFT_LINE = scene.getObjectByName('HAND_LEFT_line');
  HAND_LEFT_LINE.position.x = 14 - correction
  HAND_LEFT_LINE.position.z =  -12
  var THUMB_RIGHT_LINE = scene.getObjectByName('THUMB_RIGHT_line');
  THUMB_RIGHT_LINE.position.x = 18 - correction
  THUMB_RIGHT_LINE.position.z = 12
  var THUMB_LEFT_LINE = scene.getObjectByName('THUMB_LEFT_line');
  THUMB_LEFT_LINE.position.x = 18 - correction
  THUMB_LEFT_LINE.position.z =  -12
  var HANDTIP_RIGHT_LINE = scene.getObjectByName('HANDTIP_RIGHT_line');
  HANDTIP_RIGHT_LINE.position.x = 16 - correction
  HANDTIP_RIGHT_LINE.position.z = 14
  var HANDTIP_LEFT_LINE = scene.getObjectByName('HANDTIP_LEFT_line');
  HANDTIP_LEFT_LINE.position.x = 16 - correction
  HANDTIP_LEFT_LINE.position.z = -14
  var HIP_RIGHT_LINE = scene.getObjectByName('HIP_RIGHT_line');
  HIP_RIGHT_LINE.position.x = 8 - correction
  HIP_RIGHT_LINE.position.z = 2
  var HIP_LEFT_LINE = scene.getObjectByName('HIP_LEFT_line');
  HIP_LEFT_LINE.position.x = 8 - correction
  HIP_LEFT_LINE.position.z = -2
  var KNEE_RIGHT_LINE = scene.getObjectByName('KNEE_RIGHT_line');
  KNEE_RIGHT_LINE.position.x = 8 - correction
  KNEE_RIGHT_LINE.position.z = 6
  var KNEE_LEFT_LINE = scene.getObjectByName('KNEE_LEFT_line');
  KNEE_LEFT_LINE.position.x = 8 - correction
  KNEE_LEFT_LINE.position.z = -6
  var ANKLE_RIGHT_LINE = scene.getObjectByName('ANKLE_RIGHT_line');
  ANKLE_RIGHT_LINE.position.x = 8 - correction
  ANKLE_RIGHT_LINE.position.z = 10
  var ANKLE_LEFT_LINE = scene.getObjectByName('ANKLE_LEFT_line');
  ANKLE_LEFT_LINE.position.x = 8 - correction
  ANKLE_LEFT_LINE.position.z = -10
////////////////////////////////////////////////////////////////
var ANKLE_LEFT_PAD_LINE = scene.getObjectByName('ANKLE_LEFT_PAD_line')
ANKLE_LEFT_PAD_LINE.position.x = 8 - correction
ANKLE_LEFT_PAD_LINE.position.z = -12
var ANKLE_RIGHT_PAD_LINE = scene.getObjectByName('ANKLE_RIGHT_PAD_line')
ANKLE_RIGHT_PAD_LINE.position.x = 8 - correction
ANKLE_RIGHT_PAD_LINE.position.z = 12
var KNEE_LEFT_PAD_LINE = scene.getObjectByName('KNEE_LEFT_PAD_line')
KNEE_LEFT_PAD_LINE.position.x = 8 - correction
KNEE_LEFT_PAD_LINE.position.z = -8
var KNEE_RIGHT_PAD_LINE = scene.getObjectByName('KNEE_RIGHT_PAD_line')
KNEE_RIGHT_PAD_LINE.position.x = 8 - correction
KNEE_RIGHT_PAD_LINE.position.z = 8
var HIP_LEFT_PAD_LINE = scene.getObjectByName('HIP_LEFT_PAD_line')
HIP_LEFT_PAD_LINE.position.x = 8 - correction
HIP_LEFT_PAD_LINE.position.z = -4
var HIP_RIGHT_PAD_LINE = scene.getObjectByName('HIP_RIGHT_PAD_line')
HIP_RIGHT_PAD_LINE.position.x = 8 - correction
HIP_RIGHT_PAD_LINE.position.z = 4
//////////////////////////////////////////////////////////////////
var HAND_HANDTIP_RIGHT_PAD_LINE = scene.getObjectByName('HAND_HANDTIP_RIGHT_PAD_line')
HAND_HANDTIP_RIGHT_PAD_LINE.position.x = 14 - correction
HAND_HANDTIP_RIGHT_PAD_LINE.position.z = 14
var HAND_HANDTIP_LEFT_PAD_LINE = scene.getObjectByName('HAND_HANDTIP_LEFT_PAD_line')
HAND_HANDTIP_LEFT_PAD_LINE.position.x = 14 - correction
HAND_HANDTIP_LEFT_PAD_LINE.position.z = -14
var HANDTIP_THUMB_RIGHT_PAD_LINE = scene.getObjectByName('HANDTIP_THUMB_RIGHT_PAD_line')
HANDTIP_THUMB_RIGHT_PAD_LINE.position.x = 18 - correction
HANDTIP_THUMB_RIGHT_PAD_LINE.position.z = 14
var HANDTIP_THUMB_LEFT_PAD_LINE = scene.getObjectByName('HANDTIP_THUMB_LEFT_PAD_line')
HANDTIP_THUMB_LEFT_PAD_LINE.position.x = 18 - correction
HANDTIP_THUMB_LEFT_PAD_LINE.position.z = -14
var THUMB_HANDTIP_HAND_RIGHT_PAD_LINE = scene.getObjectByName('THUMB_HANDTIP_HAND_RIGHT_PAD_line')
THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.position.x = 16 - correction
THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.position.z = 12
var THUMB_HANDTIP_HAND_LEFT_PAD_LINE = scene.getObjectByName('THUMB_HANDTIP_HAND_LEFT_PAD_line')
THUMB_HANDTIP_HAND_LEFT_PAD_LINE.position.x = 16 - correction
THUMB_HANDTIP_HAND_LEFT_PAD_LINE.position.z = -12
/////////////////////////////////////////////////////////////////////
var NECK_EAR_CLAVICLE_RIGHT_PAD_LINE = scene.getObjectByName('NECK_EAR_CLAVICLE_RIGHT_PAD_line')
NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.position.x = 14 - correction
NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.position.z = 2
var NECK_EAR_CLAVICLE_LEFT_PAD_LINE = scene.getObjectByName('NECK_EAR_CLAVICLE_LEFT_PAD_line')
NECK_EAR_CLAVICLE_LEFT_PAD_LINE.position.x = 14 - correction
NECK_EAR_CLAVICLE_LEFT_PAD_LINE.position.z = -2
////////////////////////////////////////////////////////////////////// LEFT LEG PADS
var FOOT_LEFT_PAD_EDGE_BOTTOM_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.position.z = -14
var FOOT_LEFT_PAD_EDGE_TOP_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_line')
FOOT_LEFT_PAD_EDGE_TOP_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_LINE.position.z = -14
var FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_1_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.position.z = -12
var FOOT_LEFT_PAD_EDGE_TOP_1_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_1_line')
FOOT_LEFT_PAD_EDGE_TOP_1_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_1_LINE.position.z = -12
var FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_2_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.position.z = -10
var FOOT_LEFT_PAD_EDGE_TOP_2_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_2_line')
FOOT_LEFT_PAD_EDGE_TOP_2_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_2_LINE.position.z = -10
var FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_3_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.position.z = -8
var FOOT_LEFT_PAD_EDGE_TOP_3_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_3_line')
FOOT_LEFT_PAD_EDGE_TOP_3_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_3_LINE.position.z = -8
var FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_4_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.position.z = -6
var FOOT_LEFT_PAD_EDGE_TOP_4_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_4_line')
FOOT_LEFT_PAD_EDGE_TOP_4_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_4_LINE.position.z = -6
var FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_5_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.position.z = -4
var FOOT_LEFT_PAD_EDGE_TOP_5_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_5_line')
FOOT_LEFT_PAD_EDGE_TOP_5_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_5_LINE.position.z = -4
var FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_6_line')
FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.position.x = 10 - correction
FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.position.z = -2
var FOOT_LEFT_PAD_EDGE_TOP_6_LINE = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_6_line')
FOOT_LEFT_PAD_EDGE_TOP_6_LINE.position.x = 12 - correction
FOOT_LEFT_PAD_EDGE_TOP_6_LINE.position.z = -2
////////////////



////////////////////////////////////////////////////////////////////// LEFT ARM PADS


var ARM_LEFT_TOP_PAD_1_LINE = scene.getObjectByName('ARM_LEFT_TOP_PAD_1_line')
ARM_LEFT_TOP_PAD_1_LINE.position.x = 18 - correction
ARM_LEFT_TOP_PAD_1_LINE.position.z = -10
var ARM_LEFT_TOP_PAD_2_LINE = scene.getObjectByName('ARM_LEFT_TOP_PAD_2_line')
ARM_LEFT_TOP_PAD_2_LINE.position.x = 18 - correction
ARM_LEFT_TOP_PAD_2_LINE.position.z = -8
var ARM_LEFT_TOP_PAD_3_LINE = scene.getObjectByName('ARM_LEFT_TOP_PAD_3_line')
ARM_LEFT_TOP_PAD_3_LINE.position.x = 18 - correction
ARM_LEFT_TOP_PAD_3_LINE.position.z = -6
var ARM_LEFT_TOP_PAD_4_LINE = scene.getObjectByName('ARM_LEFT_TOP_PAD_4_line')
ARM_LEFT_TOP_PAD_4_LINE.position.x = 18 - correction
ARM_LEFT_TOP_PAD_4_LINE.position.z =-4
var ARM_LEFT_BOTTOM_PAD_1_LINE = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_1_line')
ARM_LEFT_BOTTOM_PAD_1_LINE.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_1_LINE.position.z = -10
var ARM_LEFT_BOTTOM_PAD_2_LINE = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_2_line')
ARM_LEFT_BOTTOM_PAD_2_LINE.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_2_LINE.position.z = -8
var ARM_LEFT_BOTTOM_PAD_3_LINE = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_3_line')
ARM_LEFT_BOTTOM_PAD_3_LINE.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_3_LINE.position.z = -6
var ARM_LEFT_BOTTOM_PAD_4_LINE = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_4_line')
ARM_LEFT_BOTTOM_PAD_4_LINE.position.x = 16 - correction
ARM_LEFT_BOTTOM_PAD_4_LINE.position.z = -4


/////////////////////////////////////////////////////////////////////// RIGHT LEG PADS

var FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.position.z = 14
var FOOT_RIGHT_PAD_EDGE_TOP_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_line')
FOOT_RIGHT_PAD_EDGE_TOP_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_LINE.position.z = 14
var FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_1_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.position.z = 12
var FOOT_RIGHT_PAD_EDGE_TOP_1_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_1_line')
FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.position.z = 12
var FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_2_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.position.z = 10
var FOOT_RIGHT_PAD_EDGE_TOP_2_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_2_line')
FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.position.z = 10
var FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_3_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.position.z = 8
var FOOT_RIGHT_PAD_EDGE_TOP_3_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_3_line')
FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.position.z = 8
var FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_4_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.position.z = 6
var FOOT_RIGHT_PAD_EDGE_TOP_4_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_4_line')
FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.position.z = 6
var FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_5_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.position.z = 4
var FOOT_RIGHT_PAD_EDGE_TOP_5_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_5_line')
FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.position.z = 4
var FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_6_line')
FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.position.x = 10 - correction
FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.position.z = 2
var FOOT_RIGHT_PAD_EDGE_TOP_6_LINE = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_6_line')
FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.position.x = 12 - correction
FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.position.z = 2



////////////////////////////////////////////////////////////////////// RIGHT ARM PADS


var ARM_RIGHT_TOP_PAD_1_LINE = scene.getObjectByName('ARM_RIGHT_TOP_PAD_1_line')
ARM_RIGHT_TOP_PAD_1_LINE.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_1_LINE.position.z = 10
var ARM_RIGHT_TOP_PAD_2_LINE = scene.getObjectByName('ARM_RIGHT_TOP_PAD_2_line')
ARM_RIGHT_TOP_PAD_2_LINE.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_2_LINE.position.z = 8
var ARM_RIGHT_TOP_PAD_3_LINE = scene.getObjectByName('ARM_RIGHT_TOP_PAD_3_line')
ARM_RIGHT_TOP_PAD_3_LINE.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_3_LINE.position.z = 6
var ARM_RIGHT_TOP_PAD_4_LINE = scene.getObjectByName('ARM_RIGHT_TOP_PAD_4_line')
ARM_RIGHT_TOP_PAD_4_LINE.position.x = 18 - correction
ARM_RIGHT_TOP_PAD_4_LINE.position.z = 4
var ARM_RIGHT_BOTTOM_PAD_1_LINE = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_1_line')
ARM_RIGHT_BOTTOM_PAD_1_LINE.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_1_LINE.position.z = 10
var ARM_RIGHT_BOTTOM_PAD_2_LINE = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_2_line')
ARM_RIGHT_BOTTOM_PAD_2_LINE.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_2_LINE.position.z = 8
var ARM_RIGHT_BOTTOM_PAD_3_LINE = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_3_line')
ARM_RIGHT_BOTTOM_PAD_3_LINE.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_3_LINE.position.z = 6
var ARM_RIGHT_BOTTOM_PAD_4_LINE = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_4_line')
ARM_RIGHT_BOTTOM_PAD_4_LINE.position.x = 16 - correction
ARM_RIGHT_BOTTOM_PAD_4_LINE.position.z = 4
/////////////
var FOOT_RIGHT_LINE = scene.getObjectByName('FOOT_RIGHT_line');
FOOT_RIGHT_LINE.position.x = 8 - correction
FOOT_RIGHT_LINE.position.z = 14
var FOOT_LEFT_LINE = scene.getObjectByName('FOOT_LEFT_line');
FOOT_LEFT_LINE.position.x = 8 - correction
FOOT_LEFT_LINE.position.z = -14

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




  let labelwidth = 300;
  let labelbigwidth = 3000;


      function makePersonForEach(currentValue){
        // console.log(currentValue)
        // console.log("forEach")
        // makePerson(x, y, labelWidth, size, name, color, number, spritename)
        // console.log("AVGECS", eval(eval(currentValue.avgearlycareersalary))/100)
        // console.log("AVGDEBT", eval(eval(currentValue.avgdebt))/1000)
        // console.log("labelwidth")
        // console.log(currentValue.name.length*100)
        makePerson(eval(currentValue.rank), 
                   eval(eval(currentValue.netprice))/100, 
                   eval(eval(currentValue.avgearlycareersalary))/100, 
                   currentValue.name.length*120, 
                   labelwidth, 
                   currentValue.name, 
                   'black', 
                   ("<div class=\"schooltitle\">" + "#"+ currentValue.rank + ": " + currentValue.name + "</div>"  + currentValue.state + "<br>" + "Net price: $" + currentValue.netprice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +"<br>" + currentValue.type + "<br>" + "Average debt: $" + currentValue.avgdebt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "<br>" + "Avg. early career salary: $" + currentValue.avgearlycareersalary.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") ), 
                   eval(eval(currentValue.avgdebt))/1000)
        
}
      // x, y, z, labelWidth, size, name, color, scale, scale1
      
      // var data1 = window.data
      // // console.log(data1)
      // // console.log("data1")
      // data1.forEach(function (item, index) { 
      // makePersonForEach(item)
      // })


  
    // makePerson(325, 300, 800, 150, 150, 'CAMERA', 'red', "CAMERA",100 ,100);
  
//   const composer = new THREE.EffectComposer( renderer );
//   const outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
// 				composer.addPass( outlinePass );
//   outlinePass.edgeThickness = 4;
//   outlinePass.edgeStrength = 10;
//   outlinePass.visibleEdgeColor.set('#f71b1b');
//   outlinePass.hiddenEdgeColor.set('#ac6b20');

//   var renderPass = new THREE.RenderPass(scene, camera);
//     // renderPass.renderToScreen = true;
//   composer.addPass(renderPass);

// 	var outputPass = new THREE.ShaderPass( THREE.CopyShader );
// 	outputPass.renderToScreen = true;
// 	composer.addPass( outputPass );
  // outlinePass.renderToScreen = true;

  // composer.renderToScreen = true;
 // const effectFXAA = new ShaderPass( FXAAShader );
 // effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
 // composer.addPass( effectFXAA );

  
  function onDocumentMouseMove( event ) {
 			const intersects = getIntersects( event.layerX, event.layerY );

			if ( intersects.length > 0 ) {
              if ( intersects[ 0 ].object != INTERSECTED ){
        // restore previous intersection object (if it exists) to its original color
 
//             // INTERSECTED.material.wireframe = false;
//                 if ( INTERSECTED ){
                  
//         INTERSECTED.parent.children[0].material.color.setHex( INTERSECTED.currentHex );
//         INTERSECTED.parent.children[0].material.emissive.r = INTERSECTED.parent.children[0].material.color.r
//         INTERSECTED.parent.children[0].material.emissive.g = INTERSECTED.parent.children[0].material.color.g
//         INTERSECTED.parent.children[0].material.emissive.b = INTERSECTED.parent.children[0].material.color.b
//                 // console.log(INTERSECTED)
//                   // console.log(INTERSECTED.currentEmissive)
//               // INTERSECTED.parent.children[0].material.emissive = INTERSECTED.currentHex 
//               INTERSECTED.parent.children[0].material.transparency = true
//               INTERSECTED.parent.children[0].material.opacity= 1;

                  
//                 // INTERSECTED.material.emissive.g = 0
//                 // INTERSECTED.material.emissive.r = 0
//                   // INTERSECTED.material.emissive = false;
//   }
//         // store reference to closest object as current intersection object
//         INTERSECTED = intersects[ 0 ].object.parent.children[0];
//         // outlinePass.selectedObjects = INTERSECTED
//         //         // outlinePass.renderToScreen = true;
//         //  composer.render()       
//         // console.log(outlinePass)
//         // console.log(composer)
                
//                 // console.log(INTERSECTED)
//                 // console.log("intersected")
//         // store color of closest object (for later restoration)
//         INTERSECTED.currentHex = INTERSECTED.parent.children[0].material.color.getHex();
//                 // console.log(INTERSECTED.parent.children[0].material.emissive)
//         INTERSECTED.currentEmissive = INTERSECTED.parent.children[0].material.emissive
//                 // console.log()
//                 // console.log(INTERSECTED.currentEmissive.r, INTERSECTED.currentEmissive.g, INTERSECTED.currentEmissive.b)
//                 // console.log(INTERSECTED.currentEmissive)
//         // set a new color for closest object
//         INTERSECTED.parent.children[0].material.color.setHex( 0xffff00 );//YELLOW
//         // INTERSECTED.material.emissive = true;
//                 INTERSECTED.parent.children[0].material.opacity= 1;
//                 INTERSECTED.material.emissive.g = 1
//                 INTERSECTED.material.emissive.r = 1
//                 INTERSECTED.material.emissive.b = 0

//         INTERSECTED.parent.children[0].material.transparency = false;
                
//         //           if (INTERSECTED.material.type != "SpriteMaterial"){
//         // INTERSECTED.parent.children[0].material.emissive.r = INTERSECTED.currentEmissive.r
//         // INTERSECTED.parent.children[0].material.emissive.g = INTERSECTED.currentEmissive.g
//         // INTERSECTED.parent.children[0].material.emissive.b = INTERSECTED.currentEmissive.b
//         //           }
//                      // document.getElementById("tooltip-title").innerHTML = INTERSECTED.name

    }
                                // console.log(event)
                // document.getElementById("tooltip").style.top = event.clientY+60 +"px"
                // document.getElementById("tooltip").style.left = event.clientX +"px"
        // document.getElementById("tooltip").classList.add("opacity1")
        // document.getElementById("tooltip").classList.remove("opacity0")
				const res = intersects.filter( function ( res ) {

					return res && res.object;

				} )[ 0 ];

				if ( res && res.object ) {
        } 			} else {
        
            if ( INTERSECTED ){
              // console.log(INTERSECTED)
              // console.log("intersected")
              
              
//         INTERSECTED.parent.children[0].material.color.setHex( INTERSECTED.currentHex );
//         INTERSECTED.parent.children[0].material.emissive.r = INTERSECTED.parent.children[0].material.color.r
//         INTERSECTED.parent.children[0].material.emissive.g = INTERSECTED.parent.children[0].material.color.g
//         INTERSECTED.parent.children[0].material.emissive.b = INTERSECTED.parent.children[0].material.color.b
//         INTERSECTED.parent.children[0].material.transparency = true
//               INTERSECTED.parent.children[0].material.opacity= 1;

                  
//                 // INTERSECTED.material.emissive.g = 0
//                 // INTERSECTED.material.emissive.r = 0
//               // INTERSECTED.material.emissive = false;
//               // document.getElementById("tooltip-title").innerHTML = null
//     // remove previous intersection object reference
//     //     by setting current intersection object to "nothing"
    INTERSECTED = null;
}
                        // console.log(event)
                // document.getElementById("tooltip").style.top = event.clientY+60 +"px"
        // document.getElementById("tooltip").style.left = event.clientX +"px"
        // document.getElementById("tooltip").style.display = "none:"
        // document.getElementById("tooltip").classList.remove("opacity1")
        // document.getElementById("tooltip").classList.add("opacity0")

      }
    // var octreeObjects = scene.search( raycaster.ray.origin, raycaster.ray.far, true, raycaster.ray.direction );
    // var intersections = raycaster.intersectOctreeObjects( scene );

//     if ( intersections.length > 0 ) {

//         if ( intersected != intersections[ 0 ].object ) {

//             if ( intersected ) intersected.material.color.set( 0xffffff );

//             intersected = intersections[ 0 ].object;
//             intersected.material.color.set( params.color );
//             $("#info").text(intersected.info.title);
//         }

//         document.body.style.cursor = 'pointer';

//     }
//     else if ( intersected ) {

//         intersected.material.color.set( 0xffffff );
//         intersected = null;
//         $("#info").text("");
//         document.body.style.cursor = 'auto';

//     } else {
//         $("#info").text("");
//     }

}

  
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth*3;
    const height = canvas.clientHeight*3;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }


  			window.addEventListener( "mousemove", onDocumentMouseMove, false );
   // document.getElementById("sliderx").addEventListener("oninput", sliderx, false)
   // document.getElementById("slidery").addEventListener("oninput", slidery, false)
   // document.getElementById("sliderz").addEventListener("oninput", sliderz, false)

var sliderx = document.getElementById("sliderx");
var slidery = document.getElementById("slidery")
var sliderz = document.getElementById("sliderz")


// console.log("CONTROLSTARGET", controls.target.x)
  
//   controls.target.x = window.controlsx
// window.controlsx = 0
// window.controlsy = 0
// window.controlsz = 0
//   controls.target.set(window.controlsx, window.controlsy, window.controlsz)
//   controls.update()

//     // controls.target.x = eval(590)
//   // console.log(controls.target)
//   controls.update()
  
// sliderx.oninput = function() {
//   // output.innerHTML = this.value;
//   // console.log("sliderx")
//   document.getElementById("sliderxamount").innerHTML = this.value
//   window.controlsx = this.value
//   controls.target.x = eval(this.value)
//   // console.log(controls.target)
//   controls.update()

// }
  
//   slidery.oninput = function() {
//   // output.innerHTML = this.value;
//     console.log("slidery")
//     document.getElementById("slideryamount").innerHTML = this.value
//     window.controlsy = this.value
//   controls.target.y = eval(this.value)
//   console.log(controls.target)
//   controls.update()
// }
  
//  sliderz.oninput = function() {
//   // output.innerHTML = this.value;
//    console.log("sliderz")
//    document.getElementById("sliderzamount").innerHTML = this.value
//    window.controlsz = this.value
//   controls.target.z = eval(this.value)
//   console.log(controls.target)
//   controls.update()
   
// }
  
  function showsprite(element){
      if (element.children.length == 2){
      element.children[1].visible = true;
    }
  }
  
  function hidesprite(element){
        if (element.children.length == 2){
      element.children[1].visible = false;
    }
  }
  
//   document.getElementById("myCheck").checked = true;
//   document.getElementById("myCheck").onclick = function() {

//   // If the checkbox is checked, display the output text
//   if (document.getElementById("myCheck").checked == true){
//     // console.log("checked")
//     scene.children.forEach(element => showsprite(element))
//   } else {
//     // console.log("not checked")
    
//     scene.children.forEach(element => hidesprite(element)

    
//   )}
    
//   }
 

 


  
  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

     renderer.render(scene, camera);
    
    // outlinePass.renderToScreen = true;
  
  
    // composer.render();
    // console.log('rendered')
    // composer.addPass( outlinePass );
    requestAnimationFrame(render);
  }
		const raycaster = new THREE.Raycaster();
		const mouseVector = new THREE.Vector3();

		function getIntersects( x, y ) {
// if (!window.capsuleOpen){
			x = ( x / window.innerWidth ) * 2 - 1;
			y = - ( y / window.innerHeight ) * 2 + 1;

			mouseVector.set( x, y, 0.5 );
			raycaster.setFromCamera( mouseVector, camera );

			return raycaster.intersectObject( scene, true );
// }
		}
  
  requestAnimationFrame(render);


document.getElementById("c").addEventListener("click", function() {
  if (INTERSECTED){
//       // output.innerHTML = this.value;
//   // console.log("sliderx")

//   // window.controlsx = this.value
//     controls.target.x = eval(INTERSECTED.parent.position.x)
//     controls.target.y = eval(INTERSECTED.parent.position.y)
//     controls.target.z = eval(INTERSECTED.parent.position.z)
//   // console.log(controls.target)
//   controls.update()
  }
})

// elbow_right: "116.672"
// hand_right: "-157.066"
// handtip_right: "-201.355"
// shoulder_right: "-21.4604"
// thumb_right: "-225.212"
// wrist_right: "-102.819"

      console.log(scene)
      
        // console.log(data[i].elbow_right, data[i].hand_right, data[i].handtip_right, data[i].shoulder_right, data[i].thumb_right, data[i].wrist_right,);
        // console.log(data[i]);








////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function updateSpheres(data){
  // console.log(data[0])
  if (data){
  let multiplier = -8

 
  let shoulderavg = (data[12].y + data[11].y)/2;
  let heady = (data[10].y + data[9].y)/2
  let shoulderneckavg = (shoulderavg + heady)/2
  let pelvisavg = ((data[24].y + data[23].y)/2)
  let neckpelvisavg = (shoulderneckavg + pelvisavg)/2
  
  PELVIS.position.y = ((data[24].y + data[23].y)/2)*multiplier //good
  HEAD.position.y = ((data[10].y + data[9].y)/2)*multiplier // [9] and [10] average //it will be to calculate "neck"
  NECK.position.y = shoulderneckavg*multiplier
  SPINE_CHEST.position.y = ((shoulderneckavg + neckpelvisavg)/2)*multiplier //maybe that's supposed to be neck????
	SPINE_NAVAL.position.y = ((pelvisavg + neckpelvisavg)/2)*multiplier
	NOSE.position.y = (data[0].y)*multiplier    //[0]
    
    
  CLAVICLE_RIGHT.position.y = ((shoulderneckavg + data[11].y)/2)*multiplier
  CLAVICLE_LEFT.position.y = ((shoulderneckavg + data[12].y)/2)*multiplier  
    
	SHOULDER_RIGHT.position.y = ((data[11].y))*multiplier
    
  ELBOW_RIGHT.position.y = ((data[13].y))*multiplier
	WRIST_RIGHT.position.y = ((data[15].y))*multiplier
    
	HAND_RIGHT.position.y = ((data[19].y + data[15].y + data[17].y)/3)*multiplier
    
	HANDTIP_RIGHT.position.y = (data[19].y)*multiplier
	THUMB_RIGHT.position.y = (data[21].y)*multiplier
	
	SHOULDER_LEFT.position.y = (data[12].y)*multiplier
	ELBOW_LEFT.position.y = (data[14].y)*multiplier
    
	WRIST_LEFT.position.y = (data[16].y)*multiplier
    
	HAND_LEFT.position.y = ((data[16].y + data[18].y + data[20].y)/3)*multiplier
    
	HANDTIP_LEFT.position.y = (data[20].y)*multiplier
	THUMB_LEFT.position.y = (data[22].y)*multiplier
 
	KNEE_RIGHT.position.y = (data[25].y)*multiplier
	ANKLE_RIGHT.position.y = (data[27].y)*multiplier
	FOOT_RIGHT.position.y = (data[31].y)*multiplier
    
  HIP_RIGHT.position.y = (data[23].y)*multiplier
	HIP_LEFT.position.y = (data[24].y)*multiplier
    
	KNEE_LEFT.position.y = (data[26].y)*multiplier
	ANKLE_LEFT.position.y = (data[28].y)*multiplier
	FOOT_LEFT.position.y = (data[32].y)*multiplier
	

	EYE_RIGHT.position.y = ((data[1].y + data[2].y + data[3].y)/3)*multiplier 
	EAR_RIGHT.position.y = (data[7].y)*multiplier
  
	EYE_LEFT.position.y = ((data[6].y + data[5].y + data[4].y)/3)*multiplier
	EAR_LEFT.position.y = (data[8].y)*multiplier
    

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    NECK_EAR_CLAVICLE_LEFT_PAD.position.y = (CLAVICLE_LEFT.position.y + EAR_LEFT.position.y + NECK.position.y )/3
    NECK_EAR_CLAVICLE_RIGHT_PAD.position.y = (CLAVICLE_RIGHT.position.y + EAR_RIGHT.position.y + NECK.position.y )/3

    HAND_HANDTIP_LEFT_PAD.position.y = (HAND_LEFT.position.y + HANDTIP_LEFT.position.y)/2
    HANDTIP_THUMB_LEFT_PAD.position.y = (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y)/2
    THUMB_HANDTIP_HAND_LEFT_PAD.position.y = (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y + HAND_LEFT.position.y)/3

    HAND_HANDTIP_RIGHT_PAD.position.y = (HAND_RIGHT.position.y + HANDTIP_RIGHT.position.y)/2
    HANDTIP_THUMB_RIGHT_PAD.position.y = (HANDTIP_RIGHT.position.y + THUMB_RIGHT.position.y)/2
    THUMB_HANDTIP_HAND_RIGHT_PAD.position.y = (HANDTIP_RIGHT.position.y + THUMB_RIGHT.position.y + HAND_RIGHT.position.y)/3
  // HAND_HANDTIP_LEFT_PAD
  // FOOT_LEFT
  
ANKLE_LEFT_PAD.position.y = ( ANKLE_LEFT.position.y + FOOT_LEFT.position.y )/2
KNEE_LEFT_PAD.position.y = ( ANKLE_LEFT.position.y + KNEE_LEFT.position.y )/2
HIP_LEFT_PAD.position.y = ( HIP_LEFT.position.y + KNEE_LEFT.position.y )/2
  
ANKLE_RIGHT_PAD.position.y = ( ANKLE_RIGHT.position.y + FOOT_RIGHT.position.y )/2
KNEE_RIGHT_PAD.position.y = ( ANKLE_RIGHT.position.y + KNEE_RIGHT.position.y )/2
HIP_RIGHT_PAD.position.y = ( HIP_RIGHT.position.y + KNEE_RIGHT.position.y )/2    
    
    
FOOT_LEFT_PAD_EDGE_BOTTOM.position.y = HAND_HANDTIP_LEFT_PAD.position.y+0.66666*(FOOT_LEFT.position.y-HAND_HANDTIP_LEFT_PAD.position.y)
FOOT_LEFT_PAD_EDGE_TOP.position.y = HAND_HANDTIP_LEFT_PAD.position.y+0.33333*(FOOT_LEFT.position.y-HAND_HANDTIP_LEFT_PAD.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM.position.y = HAND_HANDTIP_RIGHT_PAD.position.y+0.66666*(FOOT_RIGHT.position.y-HAND_HANDTIP_RIGHT_PAD.position.y)
FOOT_RIGHT_PAD_EDGE_TOP.position.y = HAND_HANDTIP_RIGHT_PAD.position.y+0.33333*(FOOT_RIGHT.position.y-HAND_HANDTIP_RIGHT_PAD.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_1.position.y = HAND_LEFT.position.y+0.66666*(ANKLE_LEFT_PAD.position.y-HAND_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_1.position.y = HAND_LEFT.position.y+0.33333*(ANKLE_LEFT_PAD.position.y-HAND_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.position.y = HAND_RIGHT.position.y+0.66666*(ANKLE_RIGHT_PAD.position.y-HAND_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_1.position.y = HAND_RIGHT.position.y+0.33333*(ANKLE_RIGHT_PAD.position.y-HAND_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_2.position.y = WRIST_LEFT.position.y+0.66666*(ANKLE_LEFT.position.y-WRIST_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_2.position.y = WRIST_LEFT.position.y+0.33333*(ANKLE_LEFT.position.y-WRIST_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.position.y = WRIST_RIGHT.position.y+0.66666*(ANKLE_RIGHT.position.y-WRIST_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_2.position.y = WRIST_RIGHT.position.y+0.33333*(ANKLE_RIGHT.position.y-WRIST_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_3.position.y = ELBOW_LEFT.position.y+0.66666*(KNEE_LEFT_PAD.position.y-ELBOW_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_3.position.y = ELBOW_LEFT.position.y+0.33333*(KNEE_LEFT_PAD.position.y-ELBOW_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.position.y = ELBOW_RIGHT.position.y+0.66666*(KNEE_RIGHT_PAD.position.y-ELBOW_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_3.position.y = ELBOW_RIGHT.position.y+0.33333*(KNEE_RIGHT_PAD.position.y-ELBOW_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_4.position.y = SHOULDER_LEFT.position.y+0.66666*(KNEE_LEFT.position.y-SHOULDER_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_4.position.y = SHOULDER_LEFT.position.y+0.33333*(KNEE_LEFT.position.y-SHOULDER_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.position.y = SHOULDER_RIGHT.position.y+0.66666*(KNEE_RIGHT.position.y-SHOULDER_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_4.position.y = SHOULDER_RIGHT.position.y+0.33333*(KNEE_RIGHT.position.y-SHOULDER_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.y = CLAVICLE_LEFT.position.y+0.66666*(HIP_LEFT_PAD.position.y-CLAVICLE_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_5.position.y = CLAVICLE_LEFT.position.y+0.33333*(HIP_LEFT_PAD.position.y-CLAVICLE_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.y = CLAVICLE_RIGHT.position.y+0.66666*(HIP_RIGHT_PAD.position.y-CLAVICLE_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_5.position.y = CLAVICLE_RIGHT.position.y+0.33333*(HIP_RIGHT_PAD.position.y-CLAVICLE_RIGHT.position.y)

FOOT_LEFT_PAD_EDGE_TOP_6.position.y = (FOOT_LEFT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y )/2
FOOT_RIGHT_PAD_EDGE_TOP_6.position.y = (FOOT_RIGHT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y )/2
FOOT_LEFT_PAD_EDGE_BOTTOM_6.position.y = (FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y )/2
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.position.y = (FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y )/2

ARM_LEFT_TOP_PAD_1.position.y = THUMB_LEFT.position.y+0.2*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
ARM_LEFT_TOP_PAD_2.position.y = THUMB_LEFT.position.y+0.4*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
ARM_LEFT_TOP_PAD_3.position.y = THUMB_LEFT.position.y+0.6*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
ARM_LEFT_TOP_PAD_4.position.y = THUMB_LEFT.position.y+0.8*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
  
ARM_RIGHT_TOP_PAD_1.position.y = THUMB_RIGHT.position.y+0.2*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)
ARM_RIGHT_TOP_PAD_2.position.y = THUMB_RIGHT.position.y+0.4*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)
ARM_RIGHT_TOP_PAD_3.position.y = THUMB_RIGHT.position.y+0.6*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)
ARM_RIGHT_TOP_PAD_4.position.y = THUMB_RIGHT.position.y+0.8*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)    

ARM_LEFT_BOTTOM_PAD_1.position.y = (ARM_LEFT_TOP_PAD_1.position.y + WRIST_LEFT.position.y + THUMB_HANDTIP_HAND_LEFT_PAD.position.y)/3
ARM_LEFT_BOTTOM_PAD_2.position.y = (ARM_LEFT_TOP_PAD_2.position.y + ELBOW_LEFT.position.y + ARM_LEFT_BOTTOM_PAD_1.position.y)/3
ARM_LEFT_BOTTOM_PAD_3.position.y = (ARM_LEFT_TOP_PAD_3.position.y + SHOULDER_LEFT.position.y + ARM_LEFT_BOTTOM_PAD_2.position.y)/3
ARM_LEFT_BOTTOM_PAD_4.position.y = (ARM_LEFT_TOP_PAD_4.position.y + CLAVICLE_LEFT.position.y + ARM_LEFT_BOTTOM_PAD_3.position.y + EAR_LEFT.position.y)/4
  
ARM_RIGHT_BOTTOM_PAD_1.position.y = (ARM_RIGHT_TOP_PAD_1.position.y + WRIST_RIGHT.position.y + THUMB_HANDTIP_HAND_RIGHT_PAD.position.y)/3
ARM_RIGHT_BOTTOM_PAD_2.position.y = (ARM_RIGHT_TOP_PAD_2.position.y + ELBOW_RIGHT.position.y + ARM_RIGHT_BOTTOM_PAD_1.position.y)/3
ARM_RIGHT_BOTTOM_PAD_3.position.y = (ARM_RIGHT_TOP_PAD_3.position.y + SHOULDER_RIGHT.position.y + ARM_RIGHT_BOTTOM_PAD_2.position.y)/3
ARM_RIGHT_BOTTOM_PAD_4.position.y = (ARM_RIGHT_TOP_PAD_4.position.y + CLAVICLE_RIGHT.position.y + ARM_RIGHT_BOTTOM_PAD_3.position.y + EAR_RIGHT.position.y)/4
    
    
    
    
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES
    

    const PELVIS_LINEpositions = PELVIS_LINE.geometry.attributes.position.array;
		PELVIS_LINEpositions[ 1 ] = ((data[24].y + data[23].y)/2)*multiplier;
    PELVIS_LINE.geometry.attributes.position.needsUpdate = true;
    
    
  const  HEAD_LINEpositions = HEAD_LINE.geometry.attributes.position.array
  const  NECK_LINEpositions = NECK_LINE.geometry.attributes.position.array
  const  SPINE_CHEST_LINEpositions = SPINE_CHEST_LINE.geometry.attributes.position.array
 	const SPINE_NAVAL_LINEpositions = SPINE_NAVAL_LINE.geometry.attributes.position.array
 	const NOSE_LINEpositions = NOSE_LINE.geometry.attributes.position.array
    
    
  const  CLAVICLE_RIGHT_LINEpositions = CLAVICLE_RIGHT_LINE.geometry.attributes.position.array
  const  CLAVICLE_LEFT_LINEpositions = CLAVICLE_LEFT_LINE.geometry.attributes.position.array
    
 	const SHOULDER_RIGHT_LINEpositions = SHOULDER_RIGHT_LINE.geometry.attributes.position.array
    
  const  ELBOW_RIGHT_LINEpositions = ELBOW_RIGHT_LINE.geometry.attributes.position.array
 	const WRIST_RIGHT_LINEpositions =  WRIST_RIGHT_LINE.geometry.attributes.position.array
    
 	const HAND_RIGHT_LINEpositions = HAND_RIGHT_LINE.geometry.attributes.position.array
    
 	const HANDTIP_RIGHT_LINEpositions = HANDTIP_RIGHT_LINE.geometry.attributes.position.array
 	const THUMB_RIGHT_LINEpositions = THUMB_RIGHT_LINE.geometry.attributes.position.array
	
 	const SHOULDER_LEFT_LINEpositions = SHOULDER_LEFT_LINE.geometry.attributes.position.array
 	const ELBOW_LEFT_LINEpositions = ELBOW_LEFT_LINE.geometry.attributes.position.array
    
 	const WRIST_LEFT_LINEpositions = WRIST_LEFT_LINE.geometry.attributes.position.array
    
 	const HAND_LEFT_LINEpositions = HAND_LEFT_LINE.geometry.attributes.position.array
    
 	const HANDTIP_LEFT_LINEpositions = HANDTIP_LEFT_LINE.geometry.attributes.position.array
 	const THUMB_LEFT_LINEpositions = THUMB_LEFT_LINE.geometry.attributes.position.array
 
 	const KNEE_RIGHT_LINEpositions = KNEE_RIGHT_LINE.geometry.attributes.position.array
 	const ANKLE_RIGHT_LINEpositions = ANKLE_RIGHT_LINE.geometry.attributes.position.array
 	const FOOT_RIGHT_LINEpositions = FOOT_RIGHT_LINE.geometry.attributes.position.array
    
  const  HIP_RIGHT_LINEpositions = HIP_RIGHT_LINE.geometry.attributes.position.array
 	const HIP_LEFT_LINEpositions = HIP_LEFT_LINE.geometry.attributes.position.array
    
 	const KNEE_LEFT_LINEpositions = KNEE_LEFT_LINE.geometry.attributes.position.array
 	const ANKLE_LEFT_LINEpositions = ANKLE_LEFT_LINE.geometry.attributes.position.array
 	const FOOT_LEFT_LINEpositions = FOOT_LEFT_LINE.geometry.attributes.position.array
	

 	const EYE_RIGHT_LINEpositions = EYE_RIGHT_LINE.geometry.attributes.position.array
 	const EAR_RIGHT_LINEpositions = EAR_RIGHT_LINE.geometry.attributes.position.array
  
 	const EYE_LEFT_LINEpositions = EYE_LEFT_LINE.geometry.attributes.position.array
 	const EAR_LEFT_LINEpositions = EAR_LEFT_LINE.geometry.attributes.position.array
    
  HEAD_LINEpositions[ 1 ] = ((data[10].y + data[9].y)/2)*multiplier // [9] and [10] average //it will be to calculate "neck"
  NECK_LINEpositions[ 1 ] = shoulderneckavg*multiplier
  SPINE_CHEST_LINEpositions[ 1 ] = ((shoulderneckavg + neckpelvisavg)/2)*multiplier //maybe that's supposed to be neck????
	SPINE_NAVAL_LINEpositions[ 1 ] = ((pelvisavg + neckpelvisavg)/2)*multiplier
	NOSE_LINEpositions[ 1 ] = (data[0].y)*multiplier    //[0]
    
    
  CLAVICLE_RIGHT_LINEpositions[ 1 ] = ((shoulderneckavg + data[11].y)/2)*multiplier
  CLAVICLE_LEFT_LINEpositions[ 1 ] = ((shoulderneckavg + data[12].y)/2)*multiplier  
    
	SHOULDER_RIGHT_LINEpositions[ 1 ] = ((data[11].y))*multiplier
    
  ELBOW_RIGHT_LINEpositions[ 1 ] = ((data[13].y))*multiplier
	WRIST_RIGHT_LINEpositions[ 1 ] = ((data[15].y))*multiplier
    
	HAND_RIGHT_LINEpositions[ 1 ] = ((data[19].y + data[15].y + data[17].y)/3)*multiplier
    
	HANDTIP_RIGHT_LINEpositions[ 1 ] = (data[19].y)*multiplier
	THUMB_RIGHT_LINEpositions[ 1 ] = (data[21].y)*multiplier
	
	SHOULDER_LEFT_LINEpositions[ 1 ] = (data[12].y)*multiplier
	ELBOW_LEFT_LINEpositions[ 1 ] = (data[14].y)*multiplier
    
	WRIST_LEFT_LINEpositions[ 1 ] = (data[16].y)*multiplier
    
	HAND_LEFT_LINEpositions[ 1 ] = ((data[16].y + data[18].y + data[20].y)/3)*multiplier
    
	HANDTIP_LEFT_LINEpositions[ 1 ] = (data[20].y)*multiplier
	THUMB_LEFT_LINEpositions[ 1 ] = (data[22].y)*multiplier
 
	KNEE_RIGHT_LINEpositions[ 1 ] = (data[25].y)*multiplier
	ANKLE_RIGHT_LINEpositions[ 1 ] = (data[27].y)*multiplier
	FOOT_RIGHT_LINEpositions[ 1 ] = (data[31].y)*multiplier
    
  HIP_RIGHT_LINEpositions[ 1 ] = (data[23].y)*multiplier
	HIP_LEFT_LINEpositions[ 1 ] = (data[24].y)*multiplier
    
	KNEE_LEFT_LINEpositions[ 1 ] = (data[26].y)*multiplier
	ANKLE_LEFT_LINEpositions[ 1 ] = (data[28].y)*multiplier
	FOOT_LEFT_LINEpositions[ 1 ] = (data[32].y)*multiplier
	

	EYE_RIGHT_LINEpositions[ 1 ] = ((data[1].y + data[2].y + data[3].y)/3)*multiplier 
	EAR_RIGHT_LINEpositions[ 1 ] = (data[7].y)*multiplier
  
	EYE_LEFT_LINEpositions[ 1 ] = ((data[6].y + data[5].y + data[4].y)/3)*multiplier
	EAR_LEFT_LINEpositions[ 1 ] = (data[8].y)*multiplier
/////////////////////////////////////////////////////////////////////////////
  HEAD_LINE.geometry.attributes.position.needsUpdate = true; 
  NECK_LINE.geometry.attributes.position.needsUpdate = true; 
  SPINE_CHEST_LINE.geometry.attributes.position.needsUpdate = true;
 	SPINE_NAVAL_LINE.geometry.attributes.position.needsUpdate = true;
 	NOSE_LINE.geometry.attributes.position.needsUpdate = true; 
    
    
  CLAVICLE_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
  CLAVICLE_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
    
 	SHOULDER_RIGHT_LINE.geometry.attributes.position.needsUpdate = true; 
    
  ELBOW_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
 	WRIST_RIGHT_LINE.geometry.attributes.position.needsUpdate = true; 
    
 	HAND_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
    
 	HANDTIP_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
 	THUMB_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
	
 	SHOULDER_LEFT_LINE.geometry.attributes.position.needsUpdate = true;
 	ELBOW_LEFT_LINE.geometry.attributes.position.needsUpdate = true;
    
 	WRIST_LEFT_LINE.geometry.attributes.position.needsUpdate = true;
    
 	HAND_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
    
 	HANDTIP_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
 	THUMB_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
 
 	KNEE_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
 	ANKLE_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
 	FOOT_RIGHT_LINE.geometry.attributes.position.needsUpdate = true; 
    
   HIP_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
 	HIP_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
    
 	KNEE_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
 	ANKLE_LEFT_LINE.geometry.attributes.position.needsUpdate = true;
 	FOOT_LEFT_LINE.geometry.attributes.position.needsUpdate = true;
	

 	EYE_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
 	EAR_RIGHT_LINE.geometry.attributes.position.needsUpdate = true;
  
 	EYE_LEFT_LINE.geometry.attributes.position.needsUpdate = true; 
 	EAR_LEFT_LINE.geometry.attributes.position.needsUpdate = true;
  // .geometry.attributes.position.needsUpdate = true;
    
    
  const ANKLE_LEFT_PAD_LINEpositions = ANKLE_LEFT_PAD_LINE.geometry.attributes.position.array;
  const KNEE_LEFT_PAD_LINEpositions = KNEE_LEFT_PAD_LINE.geometry.attributes.position.array;
  const HIP_LEFT_PAD_LINEpositions = HIP_LEFT_PAD_LINE.geometry.attributes.position.array;

  const ANKLE_RIGHT_PAD_LINEpositions = ANKLE_RIGHT_PAD_LINE.geometry.attributes.position.array;
  const KNEE_RIGHT_PAD_LINEpositions = KNEE_RIGHT_PAD_LINE.geometry.attributes.position.array;
  const HIP_RIGHT_PAD_LINEpositions = HIP_RIGHT_PAD_LINE.geometry.attributes.position.array;
/////////////////////////////////////
const HAND_HANDTIP_RIGHT_PAD_LINEpositions = HAND_HANDTIP_RIGHT_PAD_LINE.geometry.attributes.position.array;
const HAND_HANDTIP_LEFT_PAD_LINEpositions = HAND_HANDTIP_LEFT_PAD_LINE.geometry.attributes.position.array;
const HANDTIP_THUMB_RIGHT_PAD_LINEpositions = HANDTIP_THUMB_RIGHT_PAD_LINE.geometry.attributes.position.array;
const HANDTIP_THUMB_LEFT_PAD_LINEpositions = HANDTIP_THUMB_LEFT_PAD_LINE.geometry.attributes.position.array;
const THUMB_HANDTIP_HAND_RIGHT_PAD_LINEpositions = THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.geometry.attributes.position.array;
const THUMB_HANDTIP_HAND_LEFT_PAD_LINEpositions = THUMB_HANDTIP_HAND_LEFT_PAD_LINE.geometry.attributes.position.array;
////////////////////
const NECK_EAR_CLAVICLE_RIGHT_PAD_LINEpositions = NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.geometry.attributes.position.array;
const NECK_EAR_CLAVICLE_LEFT_PAD_LINEpositions = NECK_EAR_CLAVICLE_LEFT_PAD_LINE.geometry.attributes.position.array;
////////////
const FOOT_LEFT_PAD_EDGE_BOTTOM_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_1_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_1_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_2_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_2_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_3_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_3_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_4_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_4_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_5_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_5_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINEpositions = FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.geometry.attributes.position.array;
const FOOT_LEFT_PAD_EDGE_TOP_6_LINEpositions = FOOT_LEFT_PAD_EDGE_TOP_6_LINE.geometry.attributes.position.array;
////////////////
const FOOT_RIGHT_PAD_EDGE_BOTTOM_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_1_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_2_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_3_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_4_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_5_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINEpositions = FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.geometry.attributes.position.array;
const FOOT_RIGHT_PAD_EDGE_TOP_6_LINEpositions = FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.geometry.attributes.position.array;

const ARM_LEFT_TOP_PAD_1_LINEpositions = ARM_LEFT_TOP_PAD_1_LINE.geometry.attributes.position.array;
const ARM_LEFT_TOP_PAD_2_LINEpositions = ARM_LEFT_TOP_PAD_2_LINE.geometry.attributes.position.array;
const ARM_LEFT_TOP_PAD_3_LINEpositions = ARM_LEFT_TOP_PAD_3_LINE.geometry.attributes.position.array;
const ARM_LEFT_TOP_PAD_4_LINEpositions = ARM_LEFT_TOP_PAD_4_LINE.geometry.attributes.position.array;
const ARM_LEFT_BOTTOM_PAD_1_LINEpositions = ARM_LEFT_BOTTOM_PAD_1_LINE.geometry.attributes.position.array;
const ARM_LEFT_BOTTOM_PAD_2_LINEpositions = ARM_LEFT_BOTTOM_PAD_2_LINE.geometry.attributes.position.array;
const ARM_LEFT_BOTTOM_PAD_3_LINEpositions = ARM_LEFT_BOTTOM_PAD_3_LINE.geometry.attributes.position.array;
const ARM_LEFT_BOTTOM_PAD_4_LINEpositions = ARM_LEFT_BOTTOM_PAD_4_LINE.geometry.attributes.position.array;

const ARM_RIGHT_TOP_PAD_1_LINEpositions = ARM_RIGHT_TOP_PAD_1_LINE.geometry.attributes.position.array;
const ARM_RIGHT_TOP_PAD_2_LINEpositions = ARM_RIGHT_TOP_PAD_2_LINE.geometry.attributes.position.array;
const ARM_RIGHT_TOP_PAD_3_LINEpositions = ARM_RIGHT_TOP_PAD_3_LINE.geometry.attributes.position.array;
const ARM_RIGHT_TOP_PAD_4_LINEpositions = ARM_RIGHT_TOP_PAD_4_LINE.geometry.attributes.position.array;
const ARM_RIGHT_BOTTOM_PAD_1_LINEpositions = ARM_RIGHT_BOTTOM_PAD_1_LINE.geometry.attributes.position.array;
const ARM_RIGHT_BOTTOM_PAD_2_LINEpositions = ARM_RIGHT_BOTTOM_PAD_2_LINE.geometry.attributes.position.array;
const ARM_RIGHT_BOTTOM_PAD_3_LINEpositions = ARM_RIGHT_BOTTOM_PAD_3_LINE.geometry.attributes.position.array;
const ARM_RIGHT_BOTTOM_PAD_4_LINEpositions = ARM_RIGHT_BOTTOM_PAD_4_LINE.geometry.attributes.position.array;
    

//     ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    NECK_EAR_CLAVICLE_LEFT_PAD_LINEpositions[1] = (CLAVICLE_LEFT.position.y + EAR_LEFT.position.y + NECK.position.y )/3
    NECK_EAR_CLAVICLE_RIGHT_PAD_LINEpositions[1] = (CLAVICLE_RIGHT.position.y + EAR_RIGHT.position.y + NECK.position.y )/3

    HAND_HANDTIP_LEFT_PAD_LINEpositions[1] = (HAND_LEFT.position.y + HANDTIP_LEFT.position.y)/2
    HANDTIP_THUMB_LEFT_PAD_LINEpositions[1] = (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y)/2
    THUMB_HANDTIP_HAND_LEFT_PAD_LINEpositions[1] = (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y + HAND_LEFT.position.y)/3

    HAND_HANDTIP_RIGHT_PAD_LINEpositions[1] = (HAND_RIGHT.position.y + HANDTIP_RIGHT.position.y)/2
    HANDTIP_THUMB_RIGHT_PAD_LINEpositions[1] = (HANDTIP_RIGHT.position.y + THUMB_RIGHT.position.y)/2
    THUMB_HANDTIP_HAND_RIGHT_PAD_LINEpositions[1] = (HANDTIP_RIGHT.position.y + THUMB_RIGHT.position.y + HAND_RIGHT.position.y)/3
  
ANKLE_LEFT_PAD_LINEpositions[1] = ( ANKLE_LEFT.position.y + FOOT_LEFT.position.y )/2
KNEE_LEFT_PAD_LINEpositions[1] = ( ANKLE_LEFT.position.y + KNEE_LEFT.position.y )/2
HIP_LEFT_PAD_LINEpositions[1] = ( HIP_LEFT.position.y + KNEE_LEFT.position.y )/2
  
ANKLE_RIGHT_PAD_LINEpositions[1] = ( ANKLE_RIGHT.position.y + FOOT_RIGHT.position.y )/2
KNEE_RIGHT_PAD_LINEpositions[1] = ( ANKLE_RIGHT.position.y + KNEE_RIGHT.position.y )/2
HIP_RIGHT_PAD_LINEpositions[1] = ( HIP_RIGHT.position.y + KNEE_RIGHT.position.y )/2    
    
    
FOOT_LEFT_PAD_EDGE_BOTTOM_LINEpositions[1] = HAND_HANDTIP_LEFT_PAD.position.y+0.66666*(FOOT_LEFT.position.y-HAND_HANDTIP_LEFT_PAD.position.y)
FOOT_LEFT_PAD_EDGE_TOP_LINEpositions[1] = HAND_HANDTIP_LEFT_PAD.position.y+0.33333*(FOOT_LEFT.position.y-HAND_HANDTIP_LEFT_PAD.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_LINEpositions[1] = HAND_HANDTIP_RIGHT_PAD.position.y+0.66666*(FOOT_RIGHT.position.y-HAND_HANDTIP_RIGHT_PAD.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_LINEpositions[1] = HAND_HANDTIP_RIGHT_PAD.position.y+0.33333*(FOOT_RIGHT.position.y-HAND_HANDTIP_RIGHT_PAD.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINEpositions[1] = HAND_LEFT.position.y+0.66666*(ANKLE_LEFT_PAD.position.y-HAND_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_1_LINEpositions[1] = HAND_LEFT.position.y+0.33333*(ANKLE_LEFT_PAD.position.y-HAND_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINEpositions[1] = HAND_RIGHT.position.y+0.66666*(ANKLE_RIGHT_PAD.position.y-HAND_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_1_LINEpositions[1] = HAND_RIGHT.position.y+0.33333*(ANKLE_RIGHT_PAD.position.y-HAND_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINEpositions[1] = WRIST_LEFT.position.y+0.66666*(ANKLE_LEFT.position.y-WRIST_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_2_LINEpositions[1] = WRIST_LEFT.position.y+0.33333*(ANKLE_LEFT.position.y-WRIST_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINEpositions[1] = WRIST_RIGHT.position.y+0.66666*(ANKLE_RIGHT.position.y-WRIST_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_2_LINEpositions[1] = WRIST_RIGHT.position.y+0.33333*(ANKLE_RIGHT.position.y-WRIST_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINEpositions[1] = ELBOW_LEFT.position.y+0.66666*(KNEE_LEFT_PAD.position.y-ELBOW_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_3_LINEpositions[1] = ELBOW_LEFT.position.y+0.33333*(KNEE_LEFT_PAD.position.y-ELBOW_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINEpositions[1] = ELBOW_RIGHT.position.y+0.66666*(KNEE_RIGHT_PAD.position.y-ELBOW_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_3_LINEpositions[1] = ELBOW_RIGHT.position.y+0.33333*(KNEE_RIGHT_PAD.position.y-ELBOW_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINEpositions[1] = SHOULDER_LEFT.position.y+0.66666*(KNEE_LEFT.position.y-SHOULDER_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_4_LINEpositions[1] = SHOULDER_LEFT.position.y+0.33333*(KNEE_LEFT.position.y-SHOULDER_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINEpositions[1] = SHOULDER_RIGHT.position.y+0.66666*(KNEE_RIGHT.position.y-SHOULDER_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_4_LINEpositions[1] = SHOULDER_RIGHT.position.y+0.33333*(KNEE_RIGHT.position.y-SHOULDER_RIGHT.position.y)
    
FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINEpositions[1] = CLAVICLE_LEFT.position.y+0.66666*(HIP_LEFT_PAD.position.y-CLAVICLE_LEFT.position.y)
FOOT_LEFT_PAD_EDGE_TOP_5_LINEpositions[1] = CLAVICLE_LEFT.position.y+0.33333*(HIP_LEFT_PAD.position.y-CLAVICLE_LEFT.position.y)
    
FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINEpositions[1] = CLAVICLE_RIGHT.position.y+0.66666*(HIP_RIGHT_PAD.position.y-CLAVICLE_RIGHT.position.y)
FOOT_RIGHT_PAD_EDGE_TOP_5_LINEpositions[1] = CLAVICLE_RIGHT.position.y+0.33333*(HIP_RIGHT_PAD.position.y-CLAVICLE_RIGHT.position.y)

FOOT_LEFT_PAD_EDGE_TOP_6_LINEpositions[1] = (FOOT_LEFT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y )/2
FOOT_RIGHT_PAD_EDGE_TOP_6_LINEpositions[1] = (FOOT_RIGHT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y )/2
FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINEpositions[1] = (FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y )/2
FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINEpositions[1] = (FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y )/2

ARM_LEFT_TOP_PAD_1_LINEpositions[1] = THUMB_LEFT.position.y+0.2*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
ARM_LEFT_TOP_PAD_2_LINEpositions[1] = THUMB_LEFT.position.y+0.4*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
ARM_LEFT_TOP_PAD_3_LINEpositions[1] = THUMB_LEFT.position.y+0.6*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
ARM_LEFT_TOP_PAD_4_LINEpositions[1] = THUMB_LEFT.position.y+0.8*(EYE_LEFT.position.y-THUMB_LEFT.position.y)
  
ARM_RIGHT_TOP_PAD_1_LINEpositions[1] = THUMB_RIGHT.position.y+0.2*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)
ARM_RIGHT_TOP_PAD_2_LINEpositions[1] = THUMB_RIGHT.position.y+0.4*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)
ARM_RIGHT_TOP_PAD_3_LINEpositions[1] = THUMB_RIGHT.position.y+0.6*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)
ARM_RIGHT_TOP_PAD_4_LINEpositions[1] = THUMB_RIGHT.position.y+0.8*(EYE_RIGHT.position.y-THUMB_RIGHT.position.y)    

ARM_LEFT_BOTTOM_PAD_1_LINEpositions[1] = (ARM_LEFT_TOP_PAD_1.position.y + WRIST_LEFT.position.y + THUMB_HANDTIP_HAND_LEFT_PAD.position.y)/3
ARM_LEFT_BOTTOM_PAD_2_LINEpositions[1] = (ARM_LEFT_TOP_PAD_2.position.y + ELBOW_LEFT.position.y + ARM_LEFT_BOTTOM_PAD_1.position.y)/3
ARM_LEFT_BOTTOM_PAD_3_LINEpositions[1] = (ARM_LEFT_TOP_PAD_3.position.y + SHOULDER_LEFT.position.y + ARM_LEFT_BOTTOM_PAD_2.position.y)/3
ARM_LEFT_BOTTOM_PAD_4_LINEpositions[1] = (ARM_LEFT_TOP_PAD_4.position.y + CLAVICLE_LEFT.position.y + ARM_LEFT_BOTTOM_PAD_3.position.y + EAR_LEFT.position.y)/4
  
ARM_RIGHT_BOTTOM_PAD_1_LINEpositions[1] = (ARM_RIGHT_TOP_PAD_1.position.y + WRIST_RIGHT.position.y + THUMB_HANDTIP_HAND_RIGHT_PAD.position.y)/3
ARM_RIGHT_BOTTOM_PAD_2_LINEpositions[1] = (ARM_RIGHT_TOP_PAD_2.position.y + ELBOW_RIGHT.position.y + ARM_RIGHT_BOTTOM_PAD_1.position.y)/3
ARM_RIGHT_BOTTOM_PAD_3_LINEpositions[1] = (ARM_RIGHT_TOP_PAD_3.position.y + SHOULDER_RIGHT.position.y + ARM_RIGHT_BOTTOM_PAD_2.position.y)/3
ARM_RIGHT_BOTTOM_PAD_4_LINEpositions[1] = (ARM_RIGHT_TOP_PAD_4.position.y + CLAVICLE_RIGHT.position.y + ARM_RIGHT_BOTTOM_PAD_3.position.y + EAR_RIGHT.position.y)/4
    
    
    
    
  ANKLE_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
  KNEE_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
  HIP_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;

  ANKLE_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
  KNEE_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
  HIP_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
/////////////////////////////////////
  HAND_HANDTIP_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
                HAND_HANDTIP_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
                HANDTIP_THUMB_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
               HANDTIP_THUMB_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
                THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
               THUMB_HANDTIP_HAND_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
////////////////////
                NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
                NECK_EAR_CLAVICLE_LEFT_PAD_LINE.geometry.attributes.position.needsUpdate = true;
////////////
               FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.geometry.attributes.position.needsUpdate = true;
                FOOT_LEFT_PAD_EDGE_TOP_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.geometry.attributes.position.needsUpdate = true;
                FOOT_LEFT_PAD_EDGE_TOP_1_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_LEFT_PAD_EDGE_TOP_2_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_TOP_3_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.geometry.attributes.position.needsUpdate = true;
                FOOT_LEFT_PAD_EDGE_TOP_4_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_LEFT_PAD_EDGE_TOP_5_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_LEFT_PAD_EDGE_TOP_6_LINE.geometry.attributes.position.needsUpdate = true;
////////////////
               FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.geometry.attributes.position.needsUpdate = true;
             FOOT_RIGHT_PAD_EDGE_TOP_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.geometry.attributes.position.needsUpdate = true;
             FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.geometry.attributes.position.needsUpdate = true;
            FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.geometry.attributes.position.needsUpdate = true;
          FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.geometry.attributes.position.needsUpdate = true;
             FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.geometry.attributes.position.needsUpdate = true;
              FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.geometry.attributes.position.needsUpdate = true;
                FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.geometry.attributes.position.needsUpdate = true;
               FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.geometry.attributes.position.needsUpdate = true;

                   ARM_LEFT_TOP_PAD_1_LINE.geometry.attributes.position.needsUpdate = true;
                   ARM_LEFT_TOP_PAD_2_LINE.geometry.attributes.position.needsUpdate = true;
                   ARM_LEFT_TOP_PAD_3_LINE.geometry.attributes.position.needsUpdate = true;
                   ARM_LEFT_TOP_PAD_4_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_LEFT_BOTTOM_PAD_1_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_LEFT_BOTTOM_PAD_2_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_LEFT_BOTTOM_PAD_3_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_LEFT_BOTTOM_PAD_4_LINE.geometry.attributes.position.needsUpdate = true;

                  ARM_RIGHT_TOP_PAD_1_LINE.geometry.attributes.position.needsUpdate = true;
                 ARM_RIGHT_TOP_PAD_2_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_RIGHT_TOP_PAD_3_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_RIGHT_TOP_PAD_4_LINE.geometry.attributes.position.needsUpdate = true;
                ARM_RIGHT_BOTTOM_PAD_1_LINE.geometry.attributes.position.needsUpdate = true;
                 ARM_RIGHT_BOTTOM_PAD_2_LINE.geometry.attributes.position.needsUpdate = true;
                 ARM_RIGHT_BOTTOM_PAD_3_LINE.geometry.attributes.position.needsUpdate = true;
                  ARM_RIGHT_BOTTOM_PAD_4_LINE.geometry.attributes.position.needsUpdate = true;
  } 
}
