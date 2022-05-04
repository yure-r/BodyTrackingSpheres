/* global THREE */
const canvas = document.querySelector("#c");
// const renderer = new THREE.WebGLRenderer({canvas});
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true }); // init like this
renderer.setClearColor(0xffffff, 0); // second param is opacity, 0 => transparent
let INTERSECTED = null;
const fov = 40;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 50000;

(function () {
  // Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
  //
  //    Orbit - left mouse / touch: one-finger move
  //    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
  //    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

  const _changeEvent = {
    type: "change",
  };
  const _startEvent = {
    type: "start",
  };
  const _endEvent = {
    type: "end",
  };

  class OrbitControls extends THREE.EventDispatcher {
    constructor(object, domElement) {
      super();
      if (domElement === undefined)
        console.warn(
          'THREE.OrbitControls: The second parameter "domElement" is now mandatory.'
        );
      if (domElement === document)
        console.error(
          'THREE.OrbitControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.'
        );
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

      this.minAzimuthAngle = -Infinity; // radians

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
        LEFT: "ArrowLeft",
        UP: "ArrowUp",
        RIGHT: "ArrowRight",
        BOTTOM: "ArrowDown",
      }; // Mouse buttons

      this.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }; // Touch fingers

      this.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
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

      this.listenToKeyEvents = function (domElement) {
        domElement.addEventListener("keydown", onKeyDown);
        this._domElementKeyEvents = domElement;
      };

      this.saveState = function () {
        scope.target0.copy(scope.target);
        scope.position0.copy(scope.object.position);
        scope.zoom0 = scope.object.zoom;
      };

      this.reset = function () {
        scope.target.copy(scope.target0);
        scope.object.position.copy(scope.position0);
        scope.object.zoom = scope.zoom0;
        scope.object.updateProjectionMatrix();
        scope.dispatchEvent(_changeEvent);
        scope.update();
        state = STATE.NONE;
      }; // this method is exposed, but perhaps it would be better if we can make it private...

      this.update = (function () {
        const offset = new THREE.Vector3(); // so camera.up is the orbit axis

        const quat = new THREE.Quaternion().setFromUnitVectors(
          object.up,
          new THREE.Vector3(0, 1, 0)
        );
        const quatInverse = quat.clone().invert();
        const lastPosition = new THREE.Vector3();
        const lastQuaternion = new THREE.Quaternion();
        const twoPI = 2 * Math.PI;
        return function update() {
          const position = scope.object.position;
          offset.copy(position).sub(scope.target); // rotate offset to "y-axis-is-up" space

          offset.applyQuaternion(quat); // angle from z-axis around y-axis

          spherical.setFromVector3(offset);

          if (scope.autoRotate && state === STATE.NONE) {
            rotateLeft(getAutoRotationAngle());
          }

          if (scope.enableDamping) {
            spherical.theta += sphericalDelta.theta * scope.dampingFactor;
            spherical.phi += sphericalDelta.phi * scope.dampingFactor;
          } else {
            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;
          } // restrict theta to be between desired limits

          let min = scope.minAzimuthAngle;
          let max = scope.maxAzimuthAngle;

          if (isFinite(min) && isFinite(max)) {
            if (min < -Math.PI) min += twoPI;
            else if (min > Math.PI) min -= twoPI;
            if (max < -Math.PI) max += twoPI;
            else if (max > Math.PI) max -= twoPI;

            if (min <= max) {
              spherical.theta = Math.max(min, Math.min(max, spherical.theta));
            } else {
              spherical.theta =
                spherical.theta > (min + max) / 2
                  ? Math.max(min, spherical.theta)
                  : Math.min(max, spherical.theta);
            }
          } // restrict phi to be between desired limits

          spherical.phi = Math.max(
            scope.minPolarAngle,
            Math.min(scope.maxPolarAngle, spherical.phi)
          );
          spherical.makeSafe();
          spherical.radius *= scale; // restrict radius to be between desired limits

          spherical.radius = Math.max(
            scope.minDistance,
            Math.min(scope.maxDistance, spherical.radius)
          ); // move target to panned location

          if (scope.enableDamping === true) {
            scope.target.addScaledVector(panOffset, scope.dampingFactor);
          } else {
            scope.target.add(panOffset);
          }

          offset.setFromSpherical(spherical); // rotate offset back to "camera-up-vector-is-up" space

          offset.applyQuaternion(quatInverse);
          position.copy(scope.target).add(offset);
          scope.object.lookAt(scope.target);

          if (scope.enableDamping === true) {
            sphericalDelta.theta *= 1 - scope.dampingFactor;
            sphericalDelta.phi *= 1 - scope.dampingFactor;
            panOffset.multiplyScalar(1 - scope.dampingFactor);
          } else {
            sphericalDelta.set(0, 0, 0);
            panOffset.set(0, 0, 0);
          }

          scale = 1; // update condition is:
          // min(camera displacement, camera rotation in radians)^2 > EPS
          // using small-angle approximation cos(x/2) = 1 - x^2 / 8

          if (
            zoomChanged ||
            lastPosition.distanceToSquared(scope.object.position) > EPS ||
            8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS
          ) {
            scope.dispatchEvent(_changeEvent);
            lastPosition.copy(scope.object.position);
            lastQuaternion.copy(scope.object.quaternion);
            zoomChanged = false;
            return true;
          }

          return false;
        };
      })();

      this.dispose = function () {
        scope.domElement.removeEventListener("contextmenu", onContextMenu);
        scope.domElement.removeEventListener("pointerdown", onPointerDown);
        scope.domElement.removeEventListener("wheel", onMouseWheel);
        scope.domElement.removeEventListener("touchstart", onTouchStart);
        scope.domElement.removeEventListener("touchend", onTouchEnd);
        scope.domElement.removeEventListener("touchmove", onTouchMove);
        scope.domElement.ownerDocument.removeEventListener(
          "pointermove",
          onPointerMove
        );
        scope.domElement.ownerDocument.removeEventListener(
          "pointerup",
          onPointerUp
        );

        if (scope._domElementKeyEvents !== null) {
          scope._domElementKeyEvents.removeEventListener("keydown", onKeyDown);
        } //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
      }; //
      // internals
      //

      const scope = this;
      const STATE = {
        NONE: -1,
        ROTATE: 0,
        DOLLY: 1,
        PAN: 2,
        TOUCH_ROTATE: 3,
        TOUCH_PAN: 4,
        TOUCH_DOLLY_PAN: 5,
        TOUCH_DOLLY_ROTATE: 6,
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
        return ((2 * Math.PI) / 60 / 60) * scope.autoRotateSpeed;
      }

      function getZoomScale() {
        return Math.pow(0.95, scope.zoomSpeed);
      }

      function rotateLeft(angle) {
        sphericalDelta.theta -= angle;
      }

      function rotateUp(angle) {
        sphericalDelta.phi -= angle;
      }

      const panLeft = (function () {
        const v = new THREE.Vector3();
        return function panLeft(distance, objectMatrix) {
          v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix

          v.multiplyScalar(-distance);
          panOffset.add(v);
        };
      })();

      const panUp = (function () {
        const v = new THREE.Vector3();
        return function panUp(distance, objectMatrix) {
          if (scope.screenSpacePanning === true) {
            v.setFromMatrixColumn(objectMatrix, 1);
          } else {
            v.setFromMatrixColumn(objectMatrix, 0);
            v.crossVectors(scope.object.up, v);
          }

          v.multiplyScalar(distance);
          panOffset.add(v);
        };
      })(); // deltaX and deltaY are in pixels; right and down are positive

      const pan = (function () {
        const offset = new THREE.Vector3();
        return function pan(deltaX, deltaY) {
          const element = scope.domElement;

          if (scope.object.isPerspectiveCamera) {
            // perspective
            const position = scope.object.position;
            offset.copy(position).sub(scope.target);
            let targetDistance = offset.length(); // half of the fov is center to top of screen

            targetDistance *= Math.tan(
              ((scope.object.fov / 2) * Math.PI) / 180.0
            ); // we use only clientHeight here so aspect ratio does not distort speed

            panLeft(
              (2 * deltaX * targetDistance) / element.clientHeight,
              scope.object.matrix
            );
            panUp(
              (2 * deltaY * targetDistance) / element.clientHeight,
              scope.object.matrix
            );
          } else if (scope.object.isOrthographicCamera) {
            // orthographic
            panLeft(
              (deltaX * (scope.object.right - scope.object.left)) /
                scope.object.zoom /
                element.clientWidth,
              scope.object.matrix
            );
            panUp(
              (deltaY * (scope.object.top - scope.object.bottom)) /
                scope.object.zoom /
                element.clientHeight,
              scope.object.matrix
            );
          } else {
            // camera neither orthographic nor perspective
            console.warn(
              "WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."
            );
            scope.enablePan = false;
          }
        };
      })();

      function dollyOut(dollyScale) {
        if (scope.object.isPerspectiveCamera) {
          scale /= dollyScale;
        } else if (scope.object.isOrthographicCamera) {
          scope.object.zoom = Math.max(
            scope.minZoom,
            Math.min(scope.maxZoom, scope.object.zoom * dollyScale)
          );
          scope.object.updateProjectionMatrix();
          zoomChanged = true;
        } else {
          console.warn(
            "WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."
          );
          scope.enableZoom = false;
        }
      }

      function dollyIn(dollyScale) {
        if (scope.object.isPerspectiveCamera) {
          scale *= dollyScale;
        } else if (scope.object.isOrthographicCamera) {
          scope.object.zoom = Math.max(
            scope.minZoom,
            Math.min(scope.maxZoom, scope.object.zoom / dollyScale)
          );
          scope.object.updateProjectionMatrix();
          zoomChanged = true;
        } else {
          console.warn(
            "WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."
          );
          scope.enableZoom = false;
        }
      } //
      // event callbacks - update the object state
      //

      function handleMouseDownRotate(event) {
        rotateStart.set(event.clientX, event.clientY);
      }

      function handleMouseDownDolly(event) {
        dollyStart.set(event.clientX, event.clientY);
      }

      function handleMouseDownPan(event) {
        panStart.set(event.clientX, event.clientY);
      }

      function handleMouseMoveRotate(event) {
        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta
          .subVectors(rotateEnd, rotateStart)
          .multiplyScalar(scope.rotateSpeed);
        const element = scope.domElement;
        rotateLeft((2 * Math.PI * rotateDelta.x) / element.clientHeight); // yes, height

        rotateUp((2 * Math.PI * rotateDelta.y) / element.clientHeight);
        rotateStart.copy(rotateEnd);
        scope.update();
      }

      function handleMouseMoveDolly(event) {
        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);

        if (dollyDelta.y > 0) {
          dollyOut(getZoomScale());
        } else if (dollyDelta.y < 0) {
          dollyIn(getZoomScale());
        }

        dollyStart.copy(dollyEnd);
        scope.update();
      }

      function handleMouseMovePan(event) {
        panEnd.set(event.clientX, event.clientY);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
        pan(panDelta.x, panDelta.y);
        panStart.copy(panEnd);
        scope.update();
      }

      function handleMouseUp() {
        // no-op
      }

      function handleMouseWheel(event) {
        if (event.deltaY < 0) {
          dollyIn(getZoomScale());
        } else if (event.deltaY > 0) {
          dollyOut(getZoomScale());
        }

        scope.update();
      }

      function handleKeyDown(event) {
        let needsUpdate = false;

        switch (event.code) {
          case scope.keys.UP:
            pan(0, scope.keyPanSpeed);
            needsUpdate = true;
            break;

          case scope.keys.BOTTOM:
            pan(0, -scope.keyPanSpeed);
            needsUpdate = true;
            break;

          case scope.keys.LEFT:
            pan(scope.keyPanSpeed, 0);
            needsUpdate = true;
            break;

          case scope.keys.RIGHT:
            pan(-scope.keyPanSpeed, 0);
            needsUpdate = true;
            break;
        }

        if (needsUpdate) {
          // prevent the browser from scrolling on cursor keys
          event.preventDefault();
          scope.update();
        }
      }

      function handleTouchStartRotate(event) {
        if (event.touches.length == 1) {
          rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
          const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          rotateStart.set(x, y);
        }
      }

      function handleTouchStartPan(event) {
        if (event.touches.length == 1) {
          panStart.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
          const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          panStart.set(x, y);
        }
      }

      function handleTouchStartDolly(event) {
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        dollyStart.set(0, distance);
      }

      function handleTouchStartDollyPan(event) {
        if (scope.enableZoom) handleTouchStartDolly(event);
        if (scope.enablePan) handleTouchStartPan(event);
      }

      function handleTouchStartDollyRotate(event) {
        if (scope.enableZoom) handleTouchStartDolly(event);
        if (scope.enableRotate) handleTouchStartRotate(event);
      }

      function handleTouchMoveRotate(event) {
        if (event.touches.length == 1) {
          rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
          const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          rotateEnd.set(x, y);
        }

        rotateDelta
          .subVectors(rotateEnd, rotateStart)
          .multiplyScalar(scope.rotateSpeed);
        const element = scope.domElement;
        rotateLeft((2 * Math.PI * rotateDelta.x) / element.clientHeight); // yes, height

        rotateUp((2 * Math.PI * rotateDelta.y) / element.clientHeight);
        rotateStart.copy(rotateEnd);
      }

      function handleTouchMovePan(event) {
        if (event.touches.length == 1) {
          panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
          const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          panEnd.set(x, y);
        }

        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
        pan(panDelta.x, panDelta.y);
        panStart.copy(panEnd);
      }

      function handleTouchMoveDolly(event) {
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        dollyEnd.set(0, distance);
        dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
        dollyOut(dollyDelta.y);
        dollyStart.copy(dollyEnd);
      }

      function handleTouchMoveDollyPan(event) {
        if (scope.enableZoom) handleTouchMoveDolly(event);
        if (scope.enablePan) handleTouchMovePan(event);
      }

      function handleTouchMoveDollyRotate(event) {
        if (scope.enableZoom) handleTouchMoveDolly(event);
        if (scope.enableRotate) handleTouchMoveRotate(event);
      }

      function handleTouchEnd() {
        // no-op
      } //
      // event handlers - FSM: listen for events and reset state
      //

      function onPointerDown(event) {
        if (scope.enabled === false) return;

        switch (event.pointerType) {
          case "mouse":
          case "pen":
            onMouseDown(event);
            break;
          // TODO touch
        }
      }

      function onPointerMove(event) {
        if (scope.enabled === false) return;

        switch (event.pointerType) {
          case "mouse":
          case "pen":
            onMouseMove(event);
            break;
          // TODO touch
        }
      }

      function onPointerUp(event) {
        switch (event.pointerType) {
          case "mouse":
          case "pen":
            onMouseUp(event);
            break;
          // TODO touch
        }
      }

      function onMouseDown(event) {
        // Prevent the browser from scrolling.
        event.preventDefault(); // Manually set the focus since calling preventDefault above
        // prevents the browser from setting it automatically.

        scope.domElement.focus ? scope.domElement.focus() : window.focus();
        let mouseAction;

        switch (event.button) {
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
            mouseAction = -1;
        }

        switch (mouseAction) {
          case THREE.MOUSE.DOLLY:
            if (scope.enableZoom === false) return;
            handleMouseDownDolly(event);
            state = STATE.DOLLY;
            break;

          case THREE.MOUSE.ROTATE:
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
              if (scope.enablePan === false) return;
              handleMouseDownPan(event);
              state = STATE.PAN;
            } else {
              if (scope.enableRotate === false) return;
              handleMouseDownRotate(event);
              state = STATE.ROTATE;
            }

            break;

          case THREE.MOUSE.PAN:
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
              if (scope.enableRotate === false) return;
              handleMouseDownRotate(event);
              state = STATE.ROTATE;
            } else {
              if (scope.enablePan === false) return;
              handleMouseDownPan(event);
              state = STATE.PAN;
            }

            break;

          default:
            state = STATE.NONE;
        }

        if (state !== STATE.NONE) {
          scope.domElement.ownerDocument.addEventListener(
            "pointermove",
            onPointerMove
          );
          scope.domElement.ownerDocument.addEventListener(
            "pointerup",
            onPointerUp
          );
          scope.dispatchEvent(_startEvent);
        }
      }

      function onMouseMove(event) {
        if (scope.enabled === false) return;
        event.preventDefault();

        switch (state) {
          case STATE.ROTATE:
            if (scope.enableRotate === false) return;
            handleMouseMoveRotate(event);
            break;

          case STATE.DOLLY:
            if (scope.enableZoom === false) return;
            handleMouseMoveDolly(event);
            break;

          case STATE.PAN:
            if (scope.enablePan === false) return;
            handleMouseMovePan(event);
            break;
        }
      }

      function onMouseUp(event) {
        scope.domElement.ownerDocument.removeEventListener(
          "pointermove",
          onPointerMove
        );
        scope.domElement.ownerDocument.removeEventListener(
          "pointerup",
          onPointerUp
        );
        if (scope.enabled === false) return;
        handleMouseUp(event);
        scope.dispatchEvent(_endEvent);
        state = STATE.NONE;
      }

      function onMouseWheel(event) {
        if (
          scope.enabled === false ||
          scope.enableZoom === false ||
          (state !== STATE.NONE && state !== STATE.ROTATE)
        )
          return;
        event.preventDefault();
        scope.dispatchEvent(_startEvent);
        handleMouseWheel(event);
        scope.dispatchEvent(_endEvent);
      }

      function onKeyDown(event) {
        if (scope.enabled === false || scope.enablePan === false) return;
        handleKeyDown(event);
      }

      function onTouchStart(event) {
        if (scope.enabled === false) return;
        event.preventDefault(); // prevent scrolling

        switch (event.touches.length) {
          case 1:
            switch (scope.touches.ONE) {
              case THREE.TOUCH.ROTATE:
                if (scope.enableRotate === false) return;
                handleTouchStartRotate(event);
                state = STATE.TOUCH_ROTATE;
                break;

              case THREE.TOUCH.PAN:
                if (scope.enablePan === false) return;
                handleTouchStartPan(event);
                state = STATE.TOUCH_PAN;
                break;

              default:
                state = STATE.NONE;
            }

            break;

          case 2:
            switch (scope.touches.TWO) {
              case THREE.TOUCH.DOLLY_PAN:
                if (scope.enableZoom === false && scope.enablePan === false)
                  return;
                handleTouchStartDollyPan(event);
                state = STATE.TOUCH_DOLLY_PAN;
                break;

              case THREE.TOUCH.DOLLY_ROTATE:
                if (scope.enableZoom === false && scope.enableRotate === false)
                  return;
                handleTouchStartDollyRotate(event);
                state = STATE.TOUCH_DOLLY_ROTATE;
                break;

              default:
                state = STATE.NONE;
            }

            break;

          default:
            state = STATE.NONE;
        }

        if (state !== STATE.NONE) {
          scope.dispatchEvent(_startEvent);
        }
      }

      function onTouchMove(event) {
        if (scope.enabled === false) return;
        event.preventDefault(); // prevent scrolling

        switch (state) {
          case STATE.TOUCH_ROTATE:
            if (scope.enableRotate === false) return;
            handleTouchMoveRotate(event);
            scope.update();
            break;

          case STATE.TOUCH_PAN:
            if (scope.enablePan === false) return;
            handleTouchMovePan(event);
            scope.update();
            break;

          case STATE.TOUCH_DOLLY_PAN:
            if (scope.enableZoom === false && scope.enablePan === false) return;
            handleTouchMoveDollyPan(event);
            scope.update();
            break;

          case STATE.TOUCH_DOLLY_ROTATE:
            if (scope.enableZoom === false && scope.enableRotate === false)
              return;
            handleTouchMoveDollyRotate(event);
            scope.update();
            break;

          default:
            state = STATE.NONE;
        }
      }

      function onTouchEnd(event) {
        if (scope.enabled === false) return;
        handleTouchEnd(event);
        scope.dispatchEvent(_endEvent);
        state = STATE.NONE;
      }

      function onContextMenu(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
      } //

      scope.domElement.addEventListener("contextmenu", onContextMenu);
      scope.domElement.addEventListener("pointerdown", onPointerDown);
      scope.domElement.addEventListener("wheel", onMouseWheel, {
        passive: false,
      });
      scope.domElement.addEventListener("touchstart", onTouchStart, {
        passive: false,
      });
      scope.domElement.addEventListener("touchend", onTouchEnd);
      scope.domElement.addEventListener("touchmove", onTouchMove, {
        passive: false,
      }); // force an update at start

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
    constructor(object, domElement) {
      super(object, domElement);
      this.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up

      this.mouseButtons.LEFT = THREE.MOUSE.PAN;
      this.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      this.touches.ONE = THREE.TOUCH.PAN;
      this.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    }
  }

  THREE.MapControls = MapControls;
  THREE.OrbitControls = OrbitControls;
  window.OrbitControls = OrbitControls;
})();

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
const renderwidth = window.innerWidth;
const renderheight = window.innerHeight;
renderer.setSize(renderwidth, renderheight);
camera.position.set(-60, -20, 40);
var camera_pivot = new THREE.Object3D();
var Y_AXIS = new THREE.Vector3(0, 1, 0);
const scene = new THREE.Scene();
scene.background = new THREE.Color("white");
scene.add(camera_pivot);
camera_pivot.add(camera);
camera.position.set(-60, -10, 0);
camera.lookAt(camera_pivot.position);

const controls = new window.OrbitControls(camera, canvas);

controls.target.set(0, -10, 0);
controls.enableDamping = true; //damping
controls.dampingFactor = 0.25; //damping inertia
controls.enableZoom = true; //Zooming
controls.maxZoom = 1;
controls.autoRotate = true; // enable rotation
controls.maxPolarAngle = Math.PI / 2; // Limit angle of visibility

controls.update();

function makeLabelCanvas(baseWidth, size, name) {
  const borderSize = 2;
  const ctx = document.createElement("canvas").getContext("2d");
  const font = `${size}px bold sans`;
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
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, width, height);

  // scale to fit but don't stretch
  const scaleFactor = Math.min(1, baseWidth / textWidth);
  ctx.translate(width / 2, height / 2);
  ctx.scale(scaleFactor, 1);
  ctx.fillStyle = "gray";
  // ctx.fillText(name, 0, 0);

  return ctx.canvas;
}

function makePerson(x, y, z, labelWidth, size, name, color, scale, scale1) {
  const canvas = makeLabelCanvas(labelWidth, size, name);
  const texture = new THREE.CanvasTexture(canvas);

  const headGeometry = new THREE.BoxGeometry(0, 0, 0);

  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const root = new THREE.Object3D();
  root.position.x = x;
  root.position.z = y;
  root.position.y = z;

  const map = new THREE.TextureLoader().load(
    "https://cdn.glitch.com/3972d6f4-892b-4df1-adda-0da6e2ddf320%2Fblackcircle.png?v=1632087241039"
  );
  const material = new THREE.SpriteMaterial({ map: map, color: 0xffffff });

  const head = new THREE.Sprite(material);
  head.scale.set(0.5, 0.5, 0.5);

  head.name = name;
  root.add(head);
  head.position.y = 0;
  const material2 = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 5,
  });

  const points = [];
  points.push(new THREE.Vector3(x, 0, z));
  points.push(new THREE.Vector3(x, head.position.y, z));

  const geometry2 = new THREE.BufferGeometry().setFromPoints(points);

  const line = new THREE.Line(geometry2, material2);
  line.name = name + "_line";

  scene.add(line);

  const labelMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });

  const label = new THREE.Sprite(labelMaterial);
  label.name = name;
  root.add(label);
  label.position.y = (head.position.y * 4) / 5;
  label.position.z = 1.01;

  const labelBaseScale = 0.01;
  label.scale.x = canvas.width * labelBaseScale;
  label.scale.y = canvas.height * labelBaseScale;

  scene.add(root);
  return root;
}

let r = 7;

makePerson(0, 0, 0, 150, 32, "HEAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "NOSE", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "NECK", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "EYE_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "EYE_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "EAR_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "EAR_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "SPINE_CHEST", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "SPINE_NAVAL", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "PELVIS", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "CLAVICLE_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "CLAVICLE_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "SHOULDER_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "SHOULDER_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ELBOW_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ELBOW_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "WRIST_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "WRIST_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HAND_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HAND_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HANDTIP_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HANDTIP_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "THUMB_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "THUMB_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HIP_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HIP_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "KNEE_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "KNEE_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ANKLE_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ANKLE_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ANKLE_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "KNEE_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HIP_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ANKLE_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "KNEE_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HIP_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HAND_HANDTIP_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HAND_HANDTIP_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HANDTIP_THUMB_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "HANDTIP_THUMB_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "THUMB_HANDTIP_HAND_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "THUMB_HANDTIP_HAND_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "NECK_EAR_CLAVICLE_RIGHT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "NECK_EAR_CLAVICLE_LEFT_PAD", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM_5", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP_5", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_BOTTOM_6", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_LEFT_PAD_EDGE_TOP_6", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM_5", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP_5", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_BOTTOM_6", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "FOOT_RIGHT_PAD_EDGE_TOP_6", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_TOP_PAD_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_TOP_PAD_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_TOP_PAD_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_TOP_PAD_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_BOTTOM_PAD_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_BOTTOM_PAD_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_BOTTOM_PAD_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_LEFT_BOTTOM_PAD_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_TOP_PAD_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_TOP_PAD_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_TOP_PAD_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_TOP_PAD_4", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_BOTTOM_PAD_1", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_BOTTOM_PAD_2", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_BOTTOM_PAD_3", "red", 0.5, 0.5);
makePerson(0, 0, 0, 150, 32, "ARM_RIGHT_BOTTOM_PAD_4", "red", 0.5, 0.5);

const correction = 10;

var HEAD = scene.getObjectByName("HEAD");
console.log(HEAD);
HEAD.position.x = 16 - correction;
HEAD.position.z = 0;
var NOSE = scene.getObjectByName("NOSE");
NOSE.position.x = 18 - correction;
NOSE.position.z = 0;
var NECK = scene.getObjectByName("NECK");
NECK.position.x = 14 - correction;
NECK.position.z = 0;
var EYE_RIGHT = scene.getObjectByName("EYE_RIGHT");
EYE_RIGHT.position.x = 18 - correction;
EYE_RIGHT.position.z = 2;
var EYE_LEFT = scene.getObjectByName("EYE_LEFT");
EYE_LEFT.position.x = 18 - correction;
EYE_LEFT.position.z = -2;
var EAR_RIGHT = scene.getObjectByName("EAR_RIGHT");
EAR_RIGHT.position.x = 16 - correction;
EAR_RIGHT.position.z = 2;
var EAR_LEFT = scene.getObjectByName("EAR_LEFT");
EAR_LEFT.position.x = 16 - correction;
EAR_LEFT.position.z = -2;
var SPINE_CHEST = scene.getObjectByName("SPINE_CHEST");
SPINE_CHEST.position.x = 12 - correction;
SPINE_CHEST.position.z = 0;
var SPINE_NAVAL = scene.getObjectByName("SPINE_NAVAL");
SPINE_NAVAL.position.x = 10 - correction;
SPINE_NAVAL.position.z = 0;
var PELVIS = scene.getObjectByName("PELVIS");
PELVIS.position.x = 8 - correction;
PELVIS.position.z = 0;
var CLAVICLE_RIGHT = scene.getObjectByName("CLAVICLE_RIGHT");
CLAVICLE_RIGHT.position.x = 14 - correction;
CLAVICLE_RIGHT.position.z = 4;
var CLAVICLE_LEFT = scene.getObjectByName("CLAVICLE_LEFT");
CLAVICLE_LEFT.position.x = 14 - correction;
CLAVICLE_LEFT.position.z = -4;
var SHOULDER_RIGHT = scene.getObjectByName("SHOULDER_RIGHT");
SHOULDER_RIGHT.position.x = 14 - correction;
SHOULDER_RIGHT.position.z = 6;
var SHOULDER_LEFT = scene.getObjectByName("SHOULDER_LEFT");
SHOULDER_LEFT.position.x = 14 - correction;
SHOULDER_LEFT.position.z = -6;
var ELBOW_RIGHT = scene.getObjectByName("ELBOW_RIGHT");
ELBOW_RIGHT.position.x = 14 - correction;
ELBOW_RIGHT.position.z = 8;
var ELBOW_LEFT = scene.getObjectByName("ELBOW_LEFT");
ELBOW_LEFT.position.x = 14 - correction;
ELBOW_LEFT.position.z = -8;
var WRIST_RIGHT = scene.getObjectByName("WRIST_RIGHT");
WRIST_RIGHT.position.x = 14 - correction;
WRIST_RIGHT.position.z = 10;
var WRIST_LEFT = scene.getObjectByName("WRIST_LEFT");
WRIST_LEFT.position.x = 14 - correction;
WRIST_LEFT.position.z = -10;
var HAND_RIGHT = scene.getObjectByName("HAND_RIGHT");
HAND_RIGHT.position.x = 14 - correction;
HAND_RIGHT.position.z = 12;
var HAND_LEFT = scene.getObjectByName("HAND_LEFT");
HAND_LEFT.position.x = 14 - correction;
HAND_LEFT.position.z = -12;
var THUMB_RIGHT = scene.getObjectByName("THUMB_RIGHT");
THUMB_RIGHT.position.x = 18 - correction;
THUMB_RIGHT.position.z = 12;
var THUMB_LEFT = scene.getObjectByName("THUMB_LEFT");
THUMB_LEFT.position.x = 18 - correction;
THUMB_LEFT.position.z = -12;
var HANDTIP_RIGHT = scene.getObjectByName("HANDTIP_RIGHT");
HANDTIP_RIGHT.position.x = 16 - correction;
HANDTIP_RIGHT.position.z = 14;
var HANDTIP_LEFT = scene.getObjectByName("HANDTIP_LEFT");
HANDTIP_LEFT.position.x = 16 - correction;
HANDTIP_LEFT.position.z = -14;
var HIP_RIGHT = scene.getObjectByName("HIP_RIGHT");
HIP_RIGHT.position.x = 8 - correction;
HIP_RIGHT.position.z = 2;
var HIP_LEFT = scene.getObjectByName("HIP_LEFT");
HIP_LEFT.position.x = 8 - correction;
HIP_LEFT.position.z = -2;
var KNEE_RIGHT = scene.getObjectByName("KNEE_RIGHT");
KNEE_RIGHT.position.x = 8 - correction;
KNEE_RIGHT.position.z = 6;
var KNEE_LEFT = scene.getObjectByName("KNEE_LEFT");
KNEE_LEFT.position.x = 8 - correction;
KNEE_LEFT.position.z = -6;
var ANKLE_RIGHT = scene.getObjectByName("ANKLE_RIGHT");
ANKLE_RIGHT.position.x = 8 - correction;
ANKLE_RIGHT.position.z = 10;
var ANKLE_LEFT = scene.getObjectByName("ANKLE_LEFT");
ANKLE_LEFT.position.x = 8 - correction;
ANKLE_LEFT.position.z = -10;

// foot left to foot right to handtip_thumb_left_pad to handtip_thumb_right_pad
const material = new THREE.LineBasicMaterial({ color: 0x000000 });
const points = [];
points.push(new THREE.Vector3(8 - correction, 0, -14));
points.push(new THREE.Vector3(8 - correction, 0, 14));
points.push(new THREE.Vector3(18 - correction, 0, 14));
points.push(new THREE.Vector3(18 - correction, 0, -14));
points.push(new THREE.Vector3(8 - correction, 0, -14));

const geometry = new THREE.BufferGeometry().setFromPoints(points);
const line = new THREE.Line(geometry, material);

// scene.add(line)

let points2 = [];
let lines2 = [];

for (var i = -1; i < 14; i++) {
  points2.push(new THREE.Vector3(-2, 0, 12 - i * 2));
  points2.push(new THREE.Vector3(8, 0, 12 - i * 2));
  lines2.push(points2);

  const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
  const line2 = new THREE.Line(geometry2, material);

  scene.add(line2);

  points2 = [];
}

let points3 = [];
let lines3 = [];

for (var i = -1; i < 5; i++) {
  points3.push(new THREE.Vector3(6 - i * 2, 0, 14));
  points3.push(new THREE.Vector3(6 - i * 2, 0, -14));
  lines3.push(points3);

  const geometry2 = new THREE.BufferGeometry().setFromPoints(points3);
  const line3 = new THREE.Line(geometry2, material);

  scene.add(line3);

  points3 = [];
}

// FOOT_LEFT.position.x = 8 - correction
// FOOT_LEFT.position.z = -14
// // var FOOT_RIGHT = scene.getObjectByName('FOOT_RIGHT');
// FOOT_RIGHT.position.x = 8 - correction
// FOOT_RIGHT.position.z = 14

// // var HANDTIP_THUMB_LEFT_PAD = scene.getObjectByName('HANDTIP_THUMB_LEFT_PAD')
// HANDTIP_THUMB_LEFT_PAD.position.x = 18 - correction
// HANDTIP_THUMB_LEFT_PAD.position.z = -14

// // var HANDTIP_THUMB_RIGHT_PAD = scene.getObjectByName('HANDTIP_THUMB_RIGHT_PAD')
// HANDTIP_THUMB_RIGHT_PAD.position.x = 18 - correction
// HANDTIP_THUMB_RIGHT_PAD.position.z = 14

////////////////////////////////////////////////////////////////
var ANKLE_LEFT_PAD = scene.getObjectByName("ANKLE_LEFT_PAD");
ANKLE_LEFT_PAD.position.x = 8 - correction;
ANKLE_LEFT_PAD.position.z = -12;
var ANKLE_RIGHT_PAD = scene.getObjectByName("ANKLE_RIGHT_PAD");
ANKLE_RIGHT_PAD.position.x = 8 - correction;
ANKLE_RIGHT_PAD.position.z = 12;
var KNEE_LEFT_PAD = scene.getObjectByName("KNEE_LEFT_PAD");
KNEE_LEFT_PAD.position.x = 8 - correction;
KNEE_LEFT_PAD.position.z = -8;
var KNEE_RIGHT_PAD = scene.getObjectByName("KNEE_RIGHT_PAD");
KNEE_RIGHT_PAD.position.x = 8 - correction;
KNEE_RIGHT_PAD.position.z = 8;
var HIP_LEFT_PAD = scene.getObjectByName("HIP_LEFT_PAD");
HIP_LEFT_PAD.position.x = 8 - correction;
HIP_LEFT_PAD.position.z = -4;
var HIP_RIGHT_PAD = scene.getObjectByName("HIP_RIGHT_PAD");
HIP_RIGHT_PAD.position.x = 8 - correction;
HIP_RIGHT_PAD.position.z = 4;
//////////////////////////////////////////////////////////////////
var HAND_HANDTIP_RIGHT_PAD = scene.getObjectByName("HAND_HANDTIP_RIGHT_PAD");
HAND_HANDTIP_RIGHT_PAD.position.x = 14 - correction;
HAND_HANDTIP_RIGHT_PAD.position.z = 14;
var HAND_HANDTIP_LEFT_PAD = scene.getObjectByName("HAND_HANDTIP_LEFT_PAD");
HAND_HANDTIP_LEFT_PAD.position.x = 14 - correction;
HAND_HANDTIP_LEFT_PAD.position.z = -14;
var HANDTIP_THUMB_RIGHT_PAD = scene.getObjectByName("HANDTIP_THUMB_RIGHT_PAD");
HANDTIP_THUMB_RIGHT_PAD.position.x = 18 - correction;
HANDTIP_THUMB_RIGHT_PAD.position.z = 14;
var HANDTIP_THUMB_LEFT_PAD = scene.getObjectByName("HANDTIP_THUMB_LEFT_PAD");
HANDTIP_THUMB_LEFT_PAD.position.x = 18 - correction;
HANDTIP_THUMB_LEFT_PAD.position.z = -14;
var THUMB_HANDTIP_HAND_RIGHT_PAD = scene.getObjectByName(
  "THUMB_HANDTIP_HAND_RIGHT_PAD"
);
THUMB_HANDTIP_HAND_RIGHT_PAD.position.x = 16 - correction;
THUMB_HANDTIP_HAND_RIGHT_PAD.position.z = 12;
var THUMB_HANDTIP_HAND_LEFT_PAD = scene.getObjectByName(
  "THUMB_HANDTIP_HAND_LEFT_PAD"
);
THUMB_HANDTIP_HAND_LEFT_PAD.position.x = 16 - correction;
THUMB_HANDTIP_HAND_LEFT_PAD.position.z = -12;
/////////////////////////////////////////////////////////////////////
var NECK_EAR_CLAVICLE_RIGHT_PAD = scene.getObjectByName(
  "NECK_EAR_CLAVICLE_RIGHT_PAD"
);
NECK_EAR_CLAVICLE_RIGHT_PAD.position.x = 14 - correction;
NECK_EAR_CLAVICLE_RIGHT_PAD.position.z = 2;
var NECK_EAR_CLAVICLE_LEFT_PAD = scene.getObjectByName(
  "NECK_EAR_CLAVICLE_LEFT_PAD"
);
NECK_EAR_CLAVICLE_LEFT_PAD.position.x = 14 - correction;
NECK_EAR_CLAVICLE_LEFT_PAD.position.z = -2;
////////////////////////////////////////////////////////////////////// LEFT LEG PADS
var FOOT_LEFT_PAD_EDGE_BOTTOM = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM"
);
FOOT_LEFT_PAD_EDGE_BOTTOM.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM.position.z = -14;
var FOOT_LEFT_PAD_EDGE_TOP = scene.getObjectByName("FOOT_LEFT_PAD_EDGE_TOP");
FOOT_LEFT_PAD_EDGE_TOP.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP.position.z = -14;
var FOOT_LEFT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_1"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_1.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_1.position.z = -12;
var FOOT_LEFT_PAD_EDGE_TOP_1 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_1"
);
FOOT_LEFT_PAD_EDGE_TOP_1.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_1.position.z = -12;
var FOOT_LEFT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_2"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_2.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_2.position.z = -10;
var FOOT_LEFT_PAD_EDGE_TOP_2 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_2"
);
FOOT_LEFT_PAD_EDGE_TOP_2.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_2.position.z = -10;
var FOOT_LEFT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_3"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_3.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_3.position.z = -8;
var FOOT_LEFT_PAD_EDGE_TOP_3 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_3"
);
FOOT_LEFT_PAD_EDGE_TOP_3.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_3.position.z = -8;
var FOOT_LEFT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_4"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_4.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_4.position.z = -6;
var FOOT_LEFT_PAD_EDGE_TOP_4 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_4"
);
FOOT_LEFT_PAD_EDGE_TOP_4.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_4.position.z = -6;
var FOOT_LEFT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_5"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.z = -4;
var FOOT_LEFT_PAD_EDGE_TOP_5 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_5"
);
FOOT_LEFT_PAD_EDGE_TOP_5.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_5.position.z = -4;
var FOOT_LEFT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_6"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_6.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_6.position.z = -2;
var FOOT_LEFT_PAD_EDGE_TOP_6 = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_6"
);
FOOT_LEFT_PAD_EDGE_TOP_6.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_6.position.z = -2;
////////////////

////////////////////////////////////////////////////////////////////// LEFT ARM PADS

var ARM_LEFT_TOP_PAD_1 = scene.getObjectByName("ARM_LEFT_TOP_PAD_1");
ARM_LEFT_TOP_PAD_1.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_1.position.z = -10;
var ARM_LEFT_TOP_PAD_2 = scene.getObjectByName("ARM_LEFT_TOP_PAD_2");
ARM_LEFT_TOP_PAD_2.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_2.position.z = -8;
var ARM_LEFT_TOP_PAD_3 = scene.getObjectByName("ARM_LEFT_TOP_PAD_3");
ARM_LEFT_TOP_PAD_3.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_3.position.z = -6;
var ARM_LEFT_TOP_PAD_4 = scene.getObjectByName("ARM_LEFT_TOP_PAD_4");
ARM_LEFT_TOP_PAD_4.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_4.position.z = -4;
var ARM_LEFT_BOTTOM_PAD_1 = scene.getObjectByName("ARM_LEFT_BOTTOM_PAD_1");
ARM_LEFT_BOTTOM_PAD_1.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_1.position.z = -10;
var ARM_LEFT_BOTTOM_PAD_2 = scene.getObjectByName("ARM_LEFT_BOTTOM_PAD_2");
ARM_LEFT_BOTTOM_PAD_2.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_2.position.z = -8;
var ARM_LEFT_BOTTOM_PAD_3 = scene.getObjectByName("ARM_LEFT_BOTTOM_PAD_3");
ARM_LEFT_BOTTOM_PAD_3.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_3.position.z = -6;
var ARM_LEFT_BOTTOM_PAD_4 = scene.getObjectByName("ARM_LEFT_BOTTOM_PAD_4");
ARM_LEFT_BOTTOM_PAD_4.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_4.position.z = -4;

/////////////////////////////////////////////////////////////////////// RIGHT LEG PADS

var FOOT_RIGHT_PAD_EDGE_BOTTOM = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM.position.z = 14;
var FOOT_RIGHT_PAD_EDGE_TOP = scene.getObjectByName("FOOT_RIGHT_PAD_EDGE_TOP");
FOOT_RIGHT_PAD_EDGE_TOP.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP.position.z = 14;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_1"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.position.z = 12;
var FOOT_RIGHT_PAD_EDGE_TOP_1 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_1"
);
FOOT_RIGHT_PAD_EDGE_TOP_1.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_1.position.z = 12;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_2"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.position.z = 10;
var FOOT_RIGHT_PAD_EDGE_TOP_2 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_2"
);
FOOT_RIGHT_PAD_EDGE_TOP_2.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_2.position.z = 10;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_3"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.position.z = 8;
var FOOT_RIGHT_PAD_EDGE_TOP_3 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_3"
);
FOOT_RIGHT_PAD_EDGE_TOP_3.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_3.position.z = 8;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_4"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.position.z = 6;
var FOOT_RIGHT_PAD_EDGE_TOP_4 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_4"
);
FOOT_RIGHT_PAD_EDGE_TOP_4.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_4.position.z = 6;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_5"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.z = 4;
var FOOT_RIGHT_PAD_EDGE_TOP_5 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_5"
);
FOOT_RIGHT_PAD_EDGE_TOP_5.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_5.position.z = 4;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_6"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.position.z = 2;
var FOOT_RIGHT_PAD_EDGE_TOP_6 = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_6"
);
FOOT_RIGHT_PAD_EDGE_TOP_6.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_6.position.z = 2;

////////////////////////////////////////////////////////////////////// RIGHT ARM PADS

var ARM_RIGHT_TOP_PAD_1 = scene.getObjectByName("ARM_RIGHT_TOP_PAD_1");
ARM_RIGHT_TOP_PAD_1.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_1.position.z = 10;
var ARM_RIGHT_TOP_PAD_2 = scene.getObjectByName("ARM_RIGHT_TOP_PAD_2");
ARM_RIGHT_TOP_PAD_2.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_2.position.z = 8;
var ARM_RIGHT_TOP_PAD_3 = scene.getObjectByName("ARM_RIGHT_TOP_PAD_3");
ARM_RIGHT_TOP_PAD_3.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_3.position.z = 6;
var ARM_RIGHT_TOP_PAD_4 = scene.getObjectByName("ARM_RIGHT_TOP_PAD_4");
ARM_RIGHT_TOP_PAD_4.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_4.position.z = 4;
var ARM_RIGHT_BOTTOM_PAD_1 = scene.getObjectByName("ARM_RIGHT_BOTTOM_PAD_1");
ARM_RIGHT_BOTTOM_PAD_1.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_1.position.z = 10;
var ARM_RIGHT_BOTTOM_PAD_2 = scene.getObjectByName("ARM_RIGHT_BOTTOM_PAD_2");
ARM_RIGHT_BOTTOM_PAD_2.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_2.position.z = 8;
var ARM_RIGHT_BOTTOM_PAD_3 = scene.getObjectByName("ARM_RIGHT_BOTTOM_PAD_3");
ARM_RIGHT_BOTTOM_PAD_3.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_3.position.z = 6;
var ARM_RIGHT_BOTTOM_PAD_4 = scene.getObjectByName("ARM_RIGHT_BOTTOM_PAD_4");
ARM_RIGHT_BOTTOM_PAD_4.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_4.position.z = 4;
/////////////
var FOOT_RIGHT = scene.getObjectByName("FOOT_RIGHT");
FOOT_RIGHT.position.x = 8 - correction;
FOOT_RIGHT.position.z = 14;
var FOOT_LEFT = scene.getObjectByName("FOOT_LEFT");
FOOT_LEFT.position.x = 8 - correction;
FOOT_LEFT.position.z = -14;

///////////////////////////////////////////////////////////////////////////////////////////////

// var HEAD = scene.getObjectByName('HEAD');
console.log(HEAD);
HEAD.parent.children[1].position.x = 16 - correction;
HEAD.parent.children[1].position.z = 0;
// var NOSE = scene.getObjectByName('NOSE');
NOSE.parent.children[1].position.x = 18 - correction;
NOSE.parent.children[1].position.z = 0;
// var NECK = scene.getObjectByName('NECK');
NECK.parent.children[1].position.x = 14 - correction;
NECK.parent.children[1].position.z = 0;
// var EYE_RIGHT = scene.getObjectByName('EYE_RIGHT');
EYE_RIGHT.parent.children[1].position.x = 18 - correction;
EYE_RIGHT.parent.children[1].position.z = 2;
// var EYE_LEFT = scene.getObjectByName('EYE_LEFT');
EYE_LEFT.parent.children[1].position.x = 18 - correction;
EYE_LEFT.parent.children[1].position.z = -2;
// var EAR_RIGHT = scene.getObjectByName('EAR_RIGHT');
EAR_RIGHT.parent.children[1].position.x = 16 - correction;
EAR_RIGHT.parent.children[1].position.z = 2;
// var EAR_LEFT = scene.getObjectByName('EAR_LEFT');
EAR_LEFT.parent.children[1].position.x = 16 - correction;
EAR_LEFT.parent.children[1].position.z = -2;
// var SPINE_CHEST = scene.getObjectByName('SPINE_CHEST');
SPINE_CHEST.parent.children[1].position.x = 12 - correction;
SPINE_CHEST.parent.children[1].position.z = 0;
// var SPINE_NAVAL = scene.getObjectByName('SPINE_NAVAL');
SPINE_NAVAL.parent.children[1].position.x = 10 - correction;
SPINE_NAVAL.parent.children[1].position.z = 0;
// var PELVIS = scene.getObjectByName('PELVIS');
PELVIS.parent.children[1].position.x = 8 - correction;
PELVIS.parent.children[1].position.z = 0;
// var CLAVICLE_RIGHT = scene.getObjectByName('CLAVICLE_RIGHT');
CLAVICLE_RIGHT.parent.children[1].position.x = 14 - correction;
CLAVICLE_RIGHT.parent.children[1].position.z = 4;
// var CLAVICLE_LEFT = scene.getObjectByName('CLAVICLE_LEFT');
CLAVICLE_LEFT.parent.children[1].position.x = 14 - correction;
CLAVICLE_LEFT.parent.children[1].position.z = -4;
// var SHOULDER_RIGHT = scene.getObjectByName('SHOULDER_RIGHT');
SHOULDER_RIGHT.parent.children[1].position.x = 14 - correction;
SHOULDER_RIGHT.parent.children[1].position.z = 6;
// var SHOULDER_LEFT = scene.getObjectByName('SHOULDER_LEFT');
SHOULDER_LEFT.parent.children[1].position.x = 14 - correction;
SHOULDER_LEFT.parent.children[1].position.z = -6;
// var ELBOW_RIGHT = scene.getObjectByName('ELBOW_RIGHT');
ELBOW_RIGHT.parent.children[1].position.x = 14 - correction;
ELBOW_RIGHT.parent.children[1].position.z = 8;
// var ELBOW_LEFT = scene.getObjectByName('ELBOW_LEFT');
ELBOW_LEFT.parent.children[1].position.x = 14 - correction;
ELBOW_LEFT.parent.children[1].position.z = -8;
// var WRIST_RIGHT = scene.getObjectByName('WRIST_RIGHT');
WRIST_RIGHT.parent.children[1].position.x = 14 - correction;
WRIST_RIGHT.parent.children[1].position.z = 10;
// var WRIST_LEFT = scene.getObjectByName('WRIST_LEFT');
WRIST_LEFT.parent.children[1].position.x = 14 - correction;
WRIST_LEFT.parent.children[1].position.z = -10;
// var HAND_RIGHT = scene.getObjectByName('HAND_RIGHT');
HAND_RIGHT.parent.children[1].position.x = 14 - correction;
HAND_RIGHT.parent.children[1].position.z = 12;
// var HAND_LEFT = scene.getObjectByName('HAND_LEFT');
HAND_LEFT.parent.children[1].position.x = 14 - correction;
HAND_LEFT.parent.children[1].position.z = -12;
// var THUMB_RIGHT = scene.getObjectByName('THUMB_RIGHT');
THUMB_RIGHT.parent.children[1].position.x = 18 - correction;
THUMB_RIGHT.parent.children[1].position.z = 12;
// var THUMB_LEFT = scene.getObjectByName('THUMB_LEFT');
THUMB_LEFT.parent.children[1].position.x = 18 - correction;
THUMB_LEFT.parent.children[1].position.z = -12;
// var HANDTIP_RIGHT = scene.getObjectByName('HANDTIP_RIGHT');
HANDTIP_RIGHT.parent.children[1].position.x = 16 - correction;
HANDTIP_RIGHT.parent.children[1].position.z = 14;
// var HANDTIP_LEFT = scene.getObjectByName('HANDTIP_LEFT');
HANDTIP_LEFT.parent.children[1].position.x = 16 - correction;
HANDTIP_LEFT.parent.children[1].position.z = -14;
// var HIP_RIGHT = scene.getObjectByName('HIP_RIGHT');
HIP_RIGHT.parent.children[1].position.x = 8 - correction;
HIP_RIGHT.parent.children[1].position.z = 2;
// var HIP_LEFT = scene.getObjectByName('HIP_LEFT');
HIP_LEFT.parent.children[1].position.x = 8 - correction;
HIP_LEFT.parent.children[1].position.z = -2;
// var KNEE_RIGHT = scene.getObjectByName('KNEE_RIGHT');
KNEE_RIGHT.parent.children[1].position.x = 8 - correction;
KNEE_RIGHT.parent.children[1].position.z = 6;
// var KNEE_LEFT = scene.getObjectByName('KNEE_LEFT');
KNEE_LEFT.parent.children[1].position.x = 8 - correction;
KNEE_LEFT.parent.children[1].position.z = -6;
// var ANKLE_RIGHT = scene.getObjectByName('ANKLE_RIGHT');
ANKLE_RIGHT.parent.children[1].position.x = 8 - correction;
ANKLE_RIGHT.parent.children[1].position.z = 10;
// var ANKLE_LEFT = scene.getObjectByName('ANKLE_LEFT');
ANKLE_LEFT.parent.children[1].position.x = 8 - correction;
ANKLE_LEFT.parent.children[1].position.z = -10;
////////////////////////////////////////////////////////////////
// var ANKLE_LEFT_PAD = scene.getObjectByName('ANKLE_LEFT_PAD')
ANKLE_LEFT_PAD.parent.children[1].position.x = 8 - correction;
ANKLE_LEFT_PAD.parent.children[1].position.z = -12;
// var ANKLE_RIGHT_PAD = scene.getObjectByName('ANKLE_RIGHT_PAD')
ANKLE_RIGHT_PAD.parent.children[1].position.x = 8 - correction;
ANKLE_RIGHT_PAD.parent.children[1].position.z = 12;
// var KNEE_LEFT_PAD = scene.getObjectByName('KNEE_LEFT_PAD')
KNEE_LEFT_PAD.parent.children[1].position.x = 8 - correction;
KNEE_LEFT_PAD.parent.children[1].position.z = -8;
// var KNEE_RIGHT_PAD = scene.getObjectByName('KNEE_RIGHT_PAD')
KNEE_RIGHT_PAD.parent.children[1].position.x = 8 - correction;
KNEE_RIGHT_PAD.parent.children[1].position.z = 8;
// var HIP_LEFT_PAD = scene.getObjectByName('HIP_LEFT_PAD')
HIP_LEFT_PAD.parent.children[1].position.x = 8 - correction;
HIP_LEFT_PAD.parent.children[1].position.z = -4;
// var HIP_RIGHT_PAD = scene.getObjectByName('HIP_RIGHT_PAD')
HIP_RIGHT_PAD.parent.children[1].position.x = 8 - correction;
HIP_RIGHT_PAD.parent.children[1].position.z = 4;
//////////////////////////////////////////////////////////////////
// var HAND_HANDTIP_RIGHT_PAD = scene.getObjectByName('HAND_HANDTIP_RIGHT_PAD')
HAND_HANDTIP_RIGHT_PAD.parent.children[1].position.x = 14 - correction;
HAND_HANDTIP_RIGHT_PAD.parent.children[1].position.z = 14;
// var HAND_HANDTIP_LEFT_PAD = scene.getObjectByName('HAND_HANDTIP_LEFT_PAD')
HAND_HANDTIP_LEFT_PAD.parent.children[1].position.x = 14 - correction;
HAND_HANDTIP_LEFT_PAD.parent.children[1].position.z = -14;
// var HANDTIP_THUMB_RIGHT_PAD = scene.getObjectByName('HANDTIP_THUMB_RIGHT_PAD')
HANDTIP_THUMB_RIGHT_PAD.parent.children[1].position.x = 18 - correction;
HANDTIP_THUMB_RIGHT_PAD.parent.children[1].position.z = 14;
// var HANDTIP_THUMB_LEFT_PAD = scene.getObjectByName('HANDTIP_THUMB_LEFT_PAD')
HANDTIP_THUMB_LEFT_PAD.parent.children[1].position.x = 18 - correction;
HANDTIP_THUMB_LEFT_PAD.parent.children[1].position.z = -14;
// var THUMB_HANDTIP_HAND_RIGHT_PAD = scene.getObjectByName('THUMB_HANDTIP_HAND_RIGHT_PAD')
THUMB_HANDTIP_HAND_RIGHT_PAD.parent.children[1].position.x = 16 - correction;
THUMB_HANDTIP_HAND_RIGHT_PAD.parent.children[1].position.z = 12;
// var THUMB_HANDTIP_HAND_LEFT_PAD = scene.getObjectByName('THUMB_HANDTIP_HAND_LEFT_PAD')
THUMB_HANDTIP_HAND_LEFT_PAD.parent.children[1].position.x = 16 - correction;
THUMB_HANDTIP_HAND_LEFT_PAD.parent.children[1].position.z = -12;
/////////////////////////////////////////////////////////////////////
// var NECK_EAR_CLAVICLE_RIGHT_PAD = scene.getObjectByName('NECK_EAR_CLAVICLE_RIGHT_PAD')
NECK_EAR_CLAVICLE_RIGHT_PAD.parent.children[1].position.x = 14 - correction;
NECK_EAR_CLAVICLE_RIGHT_PAD.parent.children[1].position.z = 2;
// var NECK_EAR_CLAVICLE_LEFT_PAD = scene.getObjectByName('NECK_EAR_CLAVICLE_LEFT_PAD')
NECK_EAR_CLAVICLE_LEFT_PAD.parent.children[1].position.x = 14 - correction;
NECK_EAR_CLAVICLE_LEFT_PAD.parent.children[1].position.z = -2;
////////////////////////////////////////////////////////////////////// LEFT LEG PADS
// var FOOT_LEFT_PAD_EDGE_BOTTOM = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM')
FOOT_LEFT_PAD_EDGE_BOTTOM.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM.parent.children[1].position.z = -14;
// var FOOT_LEFT_PAD_EDGE_TOP = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP')
FOOT_LEFT_PAD_EDGE_TOP.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP.parent.children[1].position.z = -14;
// var FOOT_LEFT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_1')
FOOT_LEFT_PAD_EDGE_BOTTOM_1.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_1.parent.children[1].position.z = -12;
// var FOOT_LEFT_PAD_EDGE_TOP_1 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_1')
FOOT_LEFT_PAD_EDGE_TOP_1.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_1.parent.children[1].position.z = -12;
// var FOOT_LEFT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_2')
FOOT_LEFT_PAD_EDGE_BOTTOM_2.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_2.parent.children[1].position.z = -10;
// var FOOT_LEFT_PAD_EDGE_TOP_2 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_2')
FOOT_LEFT_PAD_EDGE_TOP_2.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_2.parent.children[1].position.z = -10;
// var FOOT_LEFT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_3')
FOOT_LEFT_PAD_EDGE_BOTTOM_3.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_3.parent.children[1].position.z = -8;
// var FOOT_LEFT_PAD_EDGE_TOP_3 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_3')
FOOT_LEFT_PAD_EDGE_TOP_3.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_3.parent.children[1].position.z = -8;
// var FOOT_LEFT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_4')
FOOT_LEFT_PAD_EDGE_BOTTOM_4.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_4.parent.children[1].position.z = -6;
// var FOOT_LEFT_PAD_EDGE_TOP_4 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_4')
FOOT_LEFT_PAD_EDGE_TOP_4.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_4.parent.children[1].position.z = -6;
// var FOOT_LEFT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_5')
FOOT_LEFT_PAD_EDGE_BOTTOM_5.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_5.parent.children[1].position.z = -4;
// var FOOT_LEFT_PAD_EDGE_TOP_5 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_5')
FOOT_LEFT_PAD_EDGE_TOP_5.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_5.parent.children[1].position.z = -4;
// var FOOT_LEFT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_BOTTOM_6')
FOOT_LEFT_PAD_EDGE_BOTTOM_6.parent.children[1].position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_6.parent.children[1].position.z = -2;
// var FOOT_LEFT_PAD_EDGE_TOP_6 = scene.getObjectByName('FOOT_LEFT_PAD_EDGE_TOP_6')
FOOT_LEFT_PAD_EDGE_TOP_6.parent.children[1].position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_6.parent.children[1].position.z = -2;
////////////////

////////////////////////////////////////////////////////////////////// LEFT ARM PADS

// var ARM_LEFT_TOP_PAD_1 = scene.getObjectByName('ARM_LEFT_TOP_PAD_1')
ARM_LEFT_TOP_PAD_1.parent.children[1].position.x = 18 - correction;
ARM_LEFT_TOP_PAD_1.parent.children[1].position.z = -10;
// var ARM_LEFT_TOP_PAD_2 = scene.getObjectByName('ARM_LEFT_TOP_PAD_2')
ARM_LEFT_TOP_PAD_2.parent.children[1].position.x = 18 - correction;
ARM_LEFT_TOP_PAD_2.parent.children[1].position.z = -8;
// var ARM_LEFT_TOP_PAD_3 = scene.getObjectByName('ARM_LEFT_TOP_PAD_3')
ARM_LEFT_TOP_PAD_3.parent.children[1].position.x = 18 - correction;
ARM_LEFT_TOP_PAD_3.parent.children[1].position.z = -6;
// var ARM_LEFT_TOP_PAD_4 = scene.getObjectByName('ARM_LEFT_TOP_PAD_4')
ARM_LEFT_TOP_PAD_4.parent.children[1].position.x = 18 - correction;
ARM_LEFT_TOP_PAD_4.parent.children[1].position.z = -4;
// var ARM_LEFT_BOTTOM_PAD_1 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_1')
ARM_LEFT_BOTTOM_PAD_1.parent.children[1].position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_1.parent.children[1].position.z = -10;
// var ARM_LEFT_BOTTOM_PAD_2 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_2')
ARM_LEFT_BOTTOM_PAD_2.parent.children[1].position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_2.parent.children[1].position.z = -8;
// var ARM_LEFT_BOTTOM_PAD_3 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_3')
ARM_LEFT_BOTTOM_PAD_3.parent.children[1].position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_3.parent.children[1].position.z = -6;
// var ARM_LEFT_BOTTOM_PAD_4 = scene.getObjectByName('ARM_LEFT_BOTTOM_PAD_4')
ARM_LEFT_BOTTOM_PAD_4.parent.children[1].position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_4.parent.children[1].position.z = -4;

/////////////////////////////////////////////////////////////////////// RIGHT LEG PADS

// var FOOT_RIGHT_PAD_EDGE_BOTTOM = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM')
FOOT_RIGHT_PAD_EDGE_BOTTOM.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM.parent.children[1].position.z = 14;
// var FOOT_RIGHT_PAD_EDGE_TOP = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP')
FOOT_RIGHT_PAD_EDGE_TOP.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP.parent.children[1].position.z = 14;
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_1 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_1')
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_1.parent.children[1].position.z = 12;
// var FOOT_RIGHT_PAD_EDGE_TOP_1 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_1')
FOOT_RIGHT_PAD_EDGE_TOP_1.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_1.parent.children[1].position.z = 12;
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_2 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_2')
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_2.parent.children[1].position.z = 10;
// var FOOT_RIGHT_PAD_EDGE_TOP_2 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_2')
FOOT_RIGHT_PAD_EDGE_TOP_2.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_2.parent.children[1].position.z = 10;
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_3 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_3')
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_3.parent.children[1].position.z = 8;
// var FOOT_RIGHT_PAD_EDGE_TOP_3 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_3')
FOOT_RIGHT_PAD_EDGE_TOP_3.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_3.parent.children[1].position.z = 8;
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_4 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_4')
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_4.parent.children[1].position.z = 6;
// var FOOT_RIGHT_PAD_EDGE_TOP_4 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_4')
FOOT_RIGHT_PAD_EDGE_TOP_4.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_4.parent.children[1].position.z = 6;
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_5 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_5')
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_5.parent.children[1].position.z = 4;
// var FOOT_RIGHT_PAD_EDGE_TOP_5 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_5')
FOOT_RIGHT_PAD_EDGE_TOP_5.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_5.parent.children[1].position.z = 4;
// var FOOT_RIGHT_PAD_EDGE_BOTTOM_6 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_BOTTOM_6')
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.parent.children[1].position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_6.parent.children[1].position.z = 2;
// var FOOT_RIGHT_PAD_EDGE_TOP_6 = scene.getObjectByName('FOOT_RIGHT_PAD_EDGE_TOP_6')
FOOT_RIGHT_PAD_EDGE_TOP_6.parent.children[1].position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_6.parent.children[1].position.z = 2;

////////////////////////////////////////////////////////////////////// RIGHT ARM PADS

// var ARM_RIGHT_TOP_PAD_1 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_1')
ARM_RIGHT_TOP_PAD_1.parent.children[1].position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_1.parent.children[1].position.z = 10;
// var ARM_RIGHT_TOP_PAD_2 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_2')
ARM_RIGHT_TOP_PAD_2.parent.children[1].position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_2.parent.children[1].position.z = 8;
// var ARM_RIGHT_TOP_PAD_3 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_3')
ARM_RIGHT_TOP_PAD_3.parent.children[1].position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_3.parent.children[1].position.z = 6;
// var ARM_RIGHT_TOP_PAD_4 = scene.getObjectByName('ARM_RIGHT_TOP_PAD_4')
ARM_RIGHT_TOP_PAD_4.parent.children[1].position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_4.parent.children[1].position.z = 4;
// var ARM_RIGHT_BOTTOM_PAD_1 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_1')
ARM_RIGHT_BOTTOM_PAD_1.parent.children[1].position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_1.parent.children[1].position.z = 10;
// var ARM_RIGHT_BOTTOM_PAD_2 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_2')
ARM_RIGHT_BOTTOM_PAD_2.parent.children[1].position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_2.parent.children[1].position.z = 8;
// var ARM_RIGHT_BOTTOM_PAD_3 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_3')
ARM_RIGHT_BOTTOM_PAD_3.parent.children[1].position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_3.parent.children[1].position.z = 6;
// var ARM_RIGHT_BOTTOM_PAD_4 = scene.getObjectByName('ARM_RIGHT_BOTTOM_PAD_4')
ARM_RIGHT_BOTTOM_PAD_4.parent.children[1].position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_4.parent.children[1].position.z = 4;
/////////////
// var FOOT_RIGHT = scene.getObjectByName('FOOT_RIGHT');
FOOT_RIGHT.parent.children[1].position.x = 8 - correction;
FOOT_RIGHT.parent.children[1].position.z = 14;
// var FOOT_LEFT = scene.getObjectByName('FOOT_LEFT');
FOOT_LEFT.parent.children[1].position.x = 8 - correction;
FOOT_LEFT.parent.children[1].position.z = -14;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////LINES

var HEAD_LINE = scene.getObjectByName("HEAD_line");
console.log(HEAD);
HEAD_LINE.position.x = 16 - correction;
HEAD_LINE.position.z = 0;
var NOSE_LINE = scene.getObjectByName("NOSE_line");
NOSE_LINE.position.x = 18 - correction;
NOSE_LINE.position.z = 0;
var NECK_LINE = scene.getObjectByName("NECK_line");
NECK_LINE.position.x = 14 - correction;
NECK_LINE.position.z = 0;
var EYE_RIGHT_LINE = scene.getObjectByName("EYE_RIGHT_line");
EYE_RIGHT_LINE.position.x = 18 - correction;
EYE_RIGHT_LINE.position.z = 2;
var EYE_LEFT_LINE = scene.getObjectByName("EYE_LEFT_line");
EYE_LEFT_LINE.position.x = 18 - correction;
EYE_LEFT_LINE.position.z = -2;
var EAR_RIGHT_LINE = scene.getObjectByName("EAR_RIGHT_line");
EAR_RIGHT_LINE.position.x = 16 - correction;
EAR_RIGHT_LINE.position.z = 2;
var EAR_LEFT_LINE = scene.getObjectByName("EAR_LEFT_line");
EAR_LEFT_LINE.position.x = 16 - correction;
EAR_LEFT_LINE.position.z = -2;
var SPINE_CHEST_LINE = scene.getObjectByName("SPINE_CHEST_line");
SPINE_CHEST_LINE.position.x = 12 - correction;
SPINE_CHEST_LINE.position.z = 0;
var SPINE_NAVAL_LINE = scene.getObjectByName("SPINE_NAVAL_line");
SPINE_NAVAL_LINE.position.x = 10 - correction;
SPINE_NAVAL_LINE.position.z = 0;
var PELVIS_LINE = scene.getObjectByName("PELVIS_line");
PELVIS_LINE.position.x = 8 - correction;
PELVIS_LINE.position.z = 0;
var CLAVICLE_RIGHT_LINE = scene.getObjectByName("CLAVICLE_RIGHT_line");
CLAVICLE_RIGHT_LINE.position.x = 14 - correction;
CLAVICLE_RIGHT_LINE.position.z = 4;
var CLAVICLE_LEFT_LINE = scene.getObjectByName("CLAVICLE_LEFT_line");
CLAVICLE_LEFT_LINE.position.x = 14 - correction;
CLAVICLE_LEFT_LINE.position.z = -4;
var SHOULDER_RIGHT_LINE = scene.getObjectByName("SHOULDER_RIGHT_line");
SHOULDER_RIGHT_LINE.position.x = 14 - correction;
SHOULDER_RIGHT_LINE.position.z = 6;
var SHOULDER_LEFT_LINE = scene.getObjectByName("SHOULDER_LEFT_line");
SHOULDER_LEFT_LINE.position.x = 14 - correction;
SHOULDER_LEFT_LINE.position.z = -6;
var ELBOW_RIGHT_LINE = scene.getObjectByName("ELBOW_RIGHT_line");
ELBOW_RIGHT_LINE.position.x = 14 - correction;
ELBOW_RIGHT_LINE.position.z = 8;
var ELBOW_LEFT_LINE = scene.getObjectByName("ELBOW_LEFT_line");
ELBOW_LEFT_LINE.position.x = 14 - correction;
ELBOW_LEFT_LINE.position.z = -8;
var WRIST_RIGHT_LINE = scene.getObjectByName("WRIST_RIGHT_line");
WRIST_RIGHT_LINE.position.x = 14 - correction;
WRIST_RIGHT_LINE.position.z = 10;
var WRIST_LEFT_LINE = scene.getObjectByName("WRIST_LEFT_line");
WRIST_LEFT_LINE.position.x = 14 - correction;
WRIST_LEFT_LINE.position.z = -10;
var HAND_RIGHT_LINE = scene.getObjectByName("HAND_RIGHT_line");
HAND_RIGHT_LINE.position.x = 14 - correction;
HAND_RIGHT_LINE.position.z = 12;
var HAND_LEFT_LINE = scene.getObjectByName("HAND_LEFT_line");
HAND_LEFT_LINE.position.x = 14 - correction;
HAND_LEFT_LINE.position.z = -12;
var THUMB_RIGHT_LINE = scene.getObjectByName("THUMB_RIGHT_line");
THUMB_RIGHT_LINE.position.x = 18 - correction;
THUMB_RIGHT_LINE.position.z = 12;
var THUMB_LEFT_LINE = scene.getObjectByName("THUMB_LEFT_line");
THUMB_LEFT_LINE.position.x = 18 - correction;
THUMB_LEFT_LINE.position.z = -12;
var HANDTIP_RIGHT_LINE = scene.getObjectByName("HANDTIP_RIGHT_line");
HANDTIP_RIGHT_LINE.position.x = 16 - correction;
HANDTIP_RIGHT_LINE.position.z = 14;
var HANDTIP_LEFT_LINE = scene.getObjectByName("HANDTIP_LEFT_line");
HANDTIP_LEFT_LINE.position.x = 16 - correction;
HANDTIP_LEFT_LINE.position.z = -14;
var HIP_RIGHT_LINE = scene.getObjectByName("HIP_RIGHT_line");
HIP_RIGHT_LINE.position.x = 8 - correction;
HIP_RIGHT_LINE.position.z = 2;
var HIP_LEFT_LINE = scene.getObjectByName("HIP_LEFT_line");
HIP_LEFT_LINE.position.x = 8 - correction;
HIP_LEFT_LINE.position.z = -2;
var KNEE_RIGHT_LINE = scene.getObjectByName("KNEE_RIGHT_line");
KNEE_RIGHT_LINE.position.x = 8 - correction;
KNEE_RIGHT_LINE.position.z = 6;
var KNEE_LEFT_LINE = scene.getObjectByName("KNEE_LEFT_line");
KNEE_LEFT_LINE.position.x = 8 - correction;
KNEE_LEFT_LINE.position.z = -6;
var ANKLE_RIGHT_LINE = scene.getObjectByName("ANKLE_RIGHT_line");
ANKLE_RIGHT_LINE.position.x = 8 - correction;
ANKLE_RIGHT_LINE.position.z = 10;
var ANKLE_LEFT_LINE = scene.getObjectByName("ANKLE_LEFT_line");
ANKLE_LEFT_LINE.position.x = 8 - correction;
ANKLE_LEFT_LINE.position.z = -10;
////////////////////////////////////////////////////////////////
var ANKLE_LEFT_PAD_LINE = scene.getObjectByName("ANKLE_LEFT_PAD_line");
ANKLE_LEFT_PAD_LINE.position.x = 8 - correction;
ANKLE_LEFT_PAD_LINE.position.z = -12;
var ANKLE_RIGHT_PAD_LINE = scene.getObjectByName("ANKLE_RIGHT_PAD_line");
ANKLE_RIGHT_PAD_LINE.position.x = 8 - correction;
ANKLE_RIGHT_PAD_LINE.position.z = 12;
var KNEE_LEFT_PAD_LINE = scene.getObjectByName("KNEE_LEFT_PAD_line");
KNEE_LEFT_PAD_LINE.position.x = 8 - correction;
KNEE_LEFT_PAD_LINE.position.z = -8;
var KNEE_RIGHT_PAD_LINE = scene.getObjectByName("KNEE_RIGHT_PAD_line");
KNEE_RIGHT_PAD_LINE.position.x = 8 - correction;
KNEE_RIGHT_PAD_LINE.position.z = 8;
var HIP_LEFT_PAD_LINE = scene.getObjectByName("HIP_LEFT_PAD_line");
HIP_LEFT_PAD_LINE.position.x = 8 - correction;
HIP_LEFT_PAD_LINE.position.z = -4;
var HIP_RIGHT_PAD_LINE = scene.getObjectByName("HIP_RIGHT_PAD_line");
HIP_RIGHT_PAD_LINE.position.x = 8 - correction;
HIP_RIGHT_PAD_LINE.position.z = 4;
//////////////////////////////////////////////////////////////////
var HAND_HANDTIP_RIGHT_PAD_LINE = scene.getObjectByName(
  "HAND_HANDTIP_RIGHT_PAD_line"
);
HAND_HANDTIP_RIGHT_PAD_LINE.position.x = 14 - correction;
HAND_HANDTIP_RIGHT_PAD_LINE.position.z = 14;
var HAND_HANDTIP_LEFT_PAD_LINE = scene.getObjectByName(
  "HAND_HANDTIP_LEFT_PAD_line"
);
HAND_HANDTIP_LEFT_PAD_LINE.position.x = 14 - correction;
HAND_HANDTIP_LEFT_PAD_LINE.position.z = -14;
var HANDTIP_THUMB_RIGHT_PAD_LINE = scene.getObjectByName(
  "HANDTIP_THUMB_RIGHT_PAD_line"
);
HANDTIP_THUMB_RIGHT_PAD_LINE.position.x = 18 - correction;
HANDTIP_THUMB_RIGHT_PAD_LINE.position.z = 14;
var HANDTIP_THUMB_LEFT_PAD_LINE = scene.getObjectByName(
  "HANDTIP_THUMB_LEFT_PAD_line"
);
HANDTIP_THUMB_LEFT_PAD_LINE.position.x = 18 - correction;
HANDTIP_THUMB_LEFT_PAD_LINE.position.z = -14;
var THUMB_HANDTIP_HAND_RIGHT_PAD_LINE = scene.getObjectByName(
  "THUMB_HANDTIP_HAND_RIGHT_PAD_line"
);
THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.position.x = 16 - correction;
THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.position.z = 12;
var THUMB_HANDTIP_HAND_LEFT_PAD_LINE = scene.getObjectByName(
  "THUMB_HANDTIP_HAND_LEFT_PAD_line"
);
THUMB_HANDTIP_HAND_LEFT_PAD_LINE.position.x = 16 - correction;
THUMB_HANDTIP_HAND_LEFT_PAD_LINE.position.z = -12;
/////////////////////////////////////////////////////////////////////
var NECK_EAR_CLAVICLE_RIGHT_PAD_LINE = scene.getObjectByName(
  "NECK_EAR_CLAVICLE_RIGHT_PAD_line"
);
NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.position.x = 14 - correction;
NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.position.z = 2;
var NECK_EAR_CLAVICLE_LEFT_PAD_LINE = scene.getObjectByName(
  "NECK_EAR_CLAVICLE_LEFT_PAD_line"
);
NECK_EAR_CLAVICLE_LEFT_PAD_LINE.position.x = 14 - correction;
NECK_EAR_CLAVICLE_LEFT_PAD_LINE.position.z = -2;
////////////////////////////////////////////////////////////////////// LEFT LEG PADS
var FOOT_LEFT_PAD_EDGE_BOTTOM_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.position.z = -14;
var FOOT_LEFT_PAD_EDGE_TOP_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_line"
);
FOOT_LEFT_PAD_EDGE_TOP_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_LINE.position.z = -14;
var FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_1_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.position.z = -12;
var FOOT_LEFT_PAD_EDGE_TOP_1_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_1_line"
);
FOOT_LEFT_PAD_EDGE_TOP_1_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_1_LINE.position.z = -12;
var FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_2_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.position.z = -10;
var FOOT_LEFT_PAD_EDGE_TOP_2_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_2_line"
);
FOOT_LEFT_PAD_EDGE_TOP_2_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_2_LINE.position.z = -10;
var FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_3_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.position.z = -8;
var FOOT_LEFT_PAD_EDGE_TOP_3_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_3_line"
);
FOOT_LEFT_PAD_EDGE_TOP_3_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_3_LINE.position.z = -8;
var FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_4_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.position.z = -6;
var FOOT_LEFT_PAD_EDGE_TOP_4_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_4_line"
);
FOOT_LEFT_PAD_EDGE_TOP_4_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_4_LINE.position.z = -6;
var FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_5_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.position.z = -4;
var FOOT_LEFT_PAD_EDGE_TOP_5_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_5_line"
);
FOOT_LEFT_PAD_EDGE_TOP_5_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_5_LINE.position.z = -4;
var FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_BOTTOM_6_line"
);
FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.position.x = 10 - correction;
FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.position.z = -2;
var FOOT_LEFT_PAD_EDGE_TOP_6_LINE = scene.getObjectByName(
  "FOOT_LEFT_PAD_EDGE_TOP_6_line"
);
FOOT_LEFT_PAD_EDGE_TOP_6_LINE.position.x = 12 - correction;
FOOT_LEFT_PAD_EDGE_TOP_6_LINE.position.z = -2;
////////////////

////////////////////////////////////////////////////////////////////// LEFT ARM PADS

var ARM_LEFT_TOP_PAD_1_LINE = scene.getObjectByName("ARM_LEFT_TOP_PAD_1_line");
ARM_LEFT_TOP_PAD_1_LINE.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_1_LINE.position.z = -10;
var ARM_LEFT_TOP_PAD_2_LINE = scene.getObjectByName("ARM_LEFT_TOP_PAD_2_line");
ARM_LEFT_TOP_PAD_2_LINE.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_2_LINE.position.z = -8;
var ARM_LEFT_TOP_PAD_3_LINE = scene.getObjectByName("ARM_LEFT_TOP_PAD_3_line");
ARM_LEFT_TOP_PAD_3_LINE.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_3_LINE.position.z = -6;
var ARM_LEFT_TOP_PAD_4_LINE = scene.getObjectByName("ARM_LEFT_TOP_PAD_4_line");
ARM_LEFT_TOP_PAD_4_LINE.position.x = 18 - correction;
ARM_LEFT_TOP_PAD_4_LINE.position.z = -4;
var ARM_LEFT_BOTTOM_PAD_1_LINE = scene.getObjectByName(
  "ARM_LEFT_BOTTOM_PAD_1_line"
);
ARM_LEFT_BOTTOM_PAD_1_LINE.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_1_LINE.position.z = -10;
var ARM_LEFT_BOTTOM_PAD_2_LINE = scene.getObjectByName(
  "ARM_LEFT_BOTTOM_PAD_2_line"
);
ARM_LEFT_BOTTOM_PAD_2_LINE.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_2_LINE.position.z = -8;
var ARM_LEFT_BOTTOM_PAD_3_LINE = scene.getObjectByName(
  "ARM_LEFT_BOTTOM_PAD_3_line"
);
ARM_LEFT_BOTTOM_PAD_3_LINE.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_3_LINE.position.z = -6;
var ARM_LEFT_BOTTOM_PAD_4_LINE = scene.getObjectByName(
  "ARM_LEFT_BOTTOM_PAD_4_line"
);
ARM_LEFT_BOTTOM_PAD_4_LINE.position.x = 16 - correction;
ARM_LEFT_BOTTOM_PAD_4_LINE.position.z = -4;

/////////////////////////////////////////////////////////////////////// RIGHT LEG PADS

var FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.position.z = 14;
var FOOT_RIGHT_PAD_EDGE_TOP_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_LINE.position.z = 14;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_1_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.position.z = 12;
var FOOT_RIGHT_PAD_EDGE_TOP_1_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_1_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.position.z = 12;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_2_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.position.z = 10;
var FOOT_RIGHT_PAD_EDGE_TOP_2_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_2_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.position.z = 10;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_3_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.position.z = 8;
var FOOT_RIGHT_PAD_EDGE_TOP_3_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_3_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.position.z = 8;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_4_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.position.z = 6;
var FOOT_RIGHT_PAD_EDGE_TOP_4_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_4_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.position.z = 6;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_5_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.position.z = 4;
var FOOT_RIGHT_PAD_EDGE_TOP_5_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_5_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.position.z = 4;
var FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_BOTTOM_6_line"
);
FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.position.x = 10 - correction;
FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.position.z = 2;
var FOOT_RIGHT_PAD_EDGE_TOP_6_LINE = scene.getObjectByName(
  "FOOT_RIGHT_PAD_EDGE_TOP_6_line"
);
FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.position.x = 12 - correction;
FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.position.z = 2;

////////////////////////////////////////////////////////////////////// RIGHT ARM PADS

var ARM_RIGHT_TOP_PAD_1_LINE = scene.getObjectByName(
  "ARM_RIGHT_TOP_PAD_1_line"
);
ARM_RIGHT_TOP_PAD_1_LINE.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_1_LINE.position.z = 10;
var ARM_RIGHT_TOP_PAD_2_LINE = scene.getObjectByName(
  "ARM_RIGHT_TOP_PAD_2_line"
);
ARM_RIGHT_TOP_PAD_2_LINE.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_2_LINE.position.z = 8;
var ARM_RIGHT_TOP_PAD_3_LINE = scene.getObjectByName(
  "ARM_RIGHT_TOP_PAD_3_line"
);
ARM_RIGHT_TOP_PAD_3_LINE.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_3_LINE.position.z = 6;
var ARM_RIGHT_TOP_PAD_4_LINE = scene.getObjectByName(
  "ARM_RIGHT_TOP_PAD_4_line"
);
ARM_RIGHT_TOP_PAD_4_LINE.position.x = 18 - correction;
ARM_RIGHT_TOP_PAD_4_LINE.position.z = 4;
var ARM_RIGHT_BOTTOM_PAD_1_LINE = scene.getObjectByName(
  "ARM_RIGHT_BOTTOM_PAD_1_line"
);
ARM_RIGHT_BOTTOM_PAD_1_LINE.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_1_LINE.position.z = 10;
var ARM_RIGHT_BOTTOM_PAD_2_LINE = scene.getObjectByName(
  "ARM_RIGHT_BOTTOM_PAD_2_line"
);
ARM_RIGHT_BOTTOM_PAD_2_LINE.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_2_LINE.position.z = 8;
var ARM_RIGHT_BOTTOM_PAD_3_LINE = scene.getObjectByName(
  "ARM_RIGHT_BOTTOM_PAD_3_line"
);
ARM_RIGHT_BOTTOM_PAD_3_LINE.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_3_LINE.position.z = 6;
var ARM_RIGHT_BOTTOM_PAD_4_LINE = scene.getObjectByName(
  "ARM_RIGHT_BOTTOM_PAD_4_line"
);
ARM_RIGHT_BOTTOM_PAD_4_LINE.position.x = 16 - correction;
ARM_RIGHT_BOTTOM_PAD_4_LINE.position.z = 4;
/////////////
var FOOT_RIGHT_LINE = scene.getObjectByName("FOOT_RIGHT_line");
FOOT_RIGHT_LINE.position.x = 8 - correction;
FOOT_RIGHT_LINE.position.z = 14;
var FOOT_LEFT_LINE = scene.getObjectByName("FOOT_LEFT_line");
FOOT_LEFT_LINE.position.x = 8 - correction;
FOOT_LEFT_LINE.position.z = -14;

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

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth * 3;
  const height = canvas.clientHeight * 3;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

var sliderx = document.getElementById("sliderx");
var slidery = document.getElementById("slidery");
var sliderz = document.getElementById("sliderz");

function showsprite(element) {
  if (element.children.length == 2) {
    element.children[1].visible = true;
  }
}

function hidesprite(element) {
  if (element.children.length == 2) {
    element.children[1].visible = false;
  }
}

document.getElementById("myCheck").checked = true;
document.getElementById("myCheck").onclick = function () {
  // If the checkbox is checked, display the output text
  if (document.getElementById("myCheck").checked == true) {
    scene.children.forEach((element) => showsprite(element));
  } else {
    scene.children.forEach((element) => hidesprite(element));
  }
};

function render() {
  // controls.dampingFactor = 2;   //damping inertia
  // controls.enableDamping = true;      //Zooming
  // controls.update();

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

requestAnimationFrame(render);

// console.log(scene)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function drawLines(data, multiplier, idle) {
  let positions = [
    HANDTIP_THUMB_LEFT_PAD_LINE,
    THUMB_LEFT_LINE,
    ARM_LEFT_TOP_PAD_1_LINE,
    ARM_LEFT_TOP_PAD_2_LINE,
    ARM_LEFT_TOP_PAD_3_LINE,
    ARM_LEFT_TOP_PAD_4_LINE,
    EYE_LEFT_LINE,
    NOSE_LINE,
    EYE_RIGHT_LINE,
    ARM_RIGHT_TOP_PAD_4_LINE,
    ARM_RIGHT_TOP_PAD_3_LINE,
    ARM_RIGHT_TOP_PAD_2_LINE,
    ARM_RIGHT_TOP_PAD_1_LINE,
    THUMB_RIGHT_LINE,
    HANDTIP_THUMB_RIGHT_PAD_LINE,
    HANDTIP_LEFT_LINE,
    THUMB_HANDTIP_HAND_LEFT_PAD_LINE,
    ARM_LEFT_BOTTOM_PAD_1_LINE,
    ARM_LEFT_BOTTOM_PAD_2_LINE,
    ARM_LEFT_BOTTOM_PAD_3_LINE,
    ARM_LEFT_BOTTOM_PAD_4_LINE,
    EAR_LEFT_LINE,
    HEAD_LINE,
    EAR_RIGHT_LINE,
    ARM_RIGHT_BOTTOM_PAD_4_LINE,
    ARM_RIGHT_BOTTOM_PAD_3_LINE,
    ARM_RIGHT_BOTTOM_PAD_2_LINE,
    ARM_RIGHT_BOTTOM_PAD_1_LINE,
    THUMB_HANDTIP_HAND_RIGHT_PAD_LINE,
    HANDTIP_RIGHT_LINE,
    HAND_HANDTIP_LEFT_PAD_LINE,
    HAND_LEFT_LINE,
    WRIST_LEFT_LINE,
    ELBOW_LEFT_LINE,
    SHOULDER_LEFT_LINE,
    CLAVICLE_LEFT_LINE,
    NECK_EAR_CLAVICLE_LEFT_PAD_LINE,
    NECK_LINE,
    NECK_EAR_CLAVICLE_RIGHT_PAD_LINE,
    CLAVICLE_RIGHT_LINE,
    SHOULDER_RIGHT_LINE,
    ELBOW_RIGHT_LINE,
    WRIST_RIGHT_LINE,
    HAND_RIGHT_LINE,
    HAND_HANDTIP_RIGHT_PAD_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_1_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_2_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_3_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_4_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_5_LINE,
    FOOT_LEFT_PAD_EDGE_TOP_6_LINE,
    SPINE_CHEST_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_6_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_5_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_4_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_3_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_2_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_1_LINE,
    FOOT_RIGHT_PAD_EDGE_TOP_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE,
    FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE,
    SPINE_NAVAL_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE,
    FOOT_LEFT_LINE,
    ANKLE_LEFT_PAD_LINE,
    ANKLE_LEFT_LINE,
    KNEE_LEFT_PAD_LINE,
    KNEE_LEFT_LINE,
    HIP_LEFT_PAD_LINE,
    HIP_LEFT_LINE,
    PELVIS_LINE,
    HIP_RIGHT_LINE,
    HIP_RIGHT_PAD_LINE,
    KNEE_RIGHT_LINE,
    KNEE_RIGHT_PAD_LINE,
    ANKLE_RIGHT_LINE,
    ANKLE_RIGHT_PAD_LINE,
    FOOT_RIGHT_LINE,
  ];

  if (idle) {
    for (var i = 0; i < positions.length; i++) {
      positions[i].geometry.attributes.position.array[1] = data[i].position.y;
      positions[i].geometry.attributes.position.needsUpdate = true;
    }
  } else {
    function update(object, positionY, actualLine = false) {
      let diff = Math.abs(positionY) - Math.abs(object);
      // console.log(object,positionY)
      for (var i = 0; i < 3; i++) {
        object = positionY + diff * (i / 3);
        // console.log(object)

        if (actualLine) {
          actualLine.geometry.attributes.position.array[1] = object;
          actualLine.needsUpdate = true;
        }

        //must update actual scene objects and now just variables
      }
    }

    let shoulderavg = (data[12].y + data[11].y) / 2;
    let heady = (data[10].y + data[9].y) / 2;
    let shoulderneckavg = (shoulderavg + heady) / 2;
    let pelvisavg = (data[24].y + data[23].y) / 2;
    let neckpelvisavg = (shoulderneckavg + pelvisavg) / 2;

    const PELVIS_LINEpositions = PELVIS_LINE.geometry.attributes.position.array;
    const HEAD_LINEpositions = HEAD_LINE.geometry.attributes.position.array;
    const NECK_LINEpositions = NECK_LINE.geometry.attributes.position.array;
    const SPINE_CHEST_LINEpositions =
      SPINE_CHEST_LINE.geometry.attributes.position.array;
    const SPINE_NAVAL_LINEpositions =
      SPINE_NAVAL_LINE.geometry.attributes.position.array;
    const NOSE_LINEpositions = NOSE_LINE.geometry.attributes.position.array;
    const CLAVICLE_RIGHT_LINEpositions =
      CLAVICLE_RIGHT_LINE.geometry.attributes.position.array;
    const CLAVICLE_LEFT_LINEpositions =
      CLAVICLE_LEFT_LINE.geometry.attributes.position.array;
    const SHOULDER_RIGHT_LINEpositions =
      SHOULDER_RIGHT_LINE.geometry.attributes.position.array;
    const ELBOW_RIGHT_LINEpositions =
      ELBOW_RIGHT_LINE.geometry.attributes.position.array;
    const WRIST_RIGHT_LINEpositions =
      WRIST_RIGHT_LINE.geometry.attributes.position.array;
    const HAND_RIGHT_LINEpositions =
      HAND_RIGHT_LINE.geometry.attributes.position.array;
    const HANDTIP_RIGHT_LINEpositions =
      HANDTIP_RIGHT_LINE.geometry.attributes.position.array;
    const THUMB_RIGHT_LINEpositions =
      THUMB_RIGHT_LINE.geometry.attributes.position.array;
    const SHOULDER_LEFT_LINEpositions =
      SHOULDER_LEFT_LINE.geometry.attributes.position.array;
    const ELBOW_LEFT_LINEpositions =
      ELBOW_LEFT_LINE.geometry.attributes.position.array;
    const WRIST_LEFT_LINEpositions =
      WRIST_LEFT_LINE.geometry.attributes.position.array;
    const HAND_LEFT_LINEpositions =
      HAND_LEFT_LINE.geometry.attributes.position.array;
    const HANDTIP_LEFT_LINEpositions =
      HANDTIP_LEFT_LINE.geometry.attributes.position.array;
    const THUMB_LEFT_LINEpositions =
      THUMB_LEFT_LINE.geometry.attributes.position.array;
    const KNEE_RIGHT_LINEpositions =
      KNEE_RIGHT_LINE.geometry.attributes.position.array;
    const ANKLE_RIGHT_LINEpositions =
      ANKLE_RIGHT_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_LINEpositions =
      FOOT_RIGHT_LINE.geometry.attributes.position.array;
    const HIP_RIGHT_LINEpositions =
      HIP_RIGHT_LINE.geometry.attributes.position.array;
    const HIP_LEFT_LINEpositions =
      HIP_LEFT_LINE.geometry.attributes.position.array;
    const KNEE_LEFT_LINEpositions =
      KNEE_LEFT_LINE.geometry.attributes.position.array;
    const ANKLE_LEFT_LINEpositions =
      ANKLE_LEFT_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_LINEpositions =
      FOOT_LEFT_LINE.geometry.attributes.position.array;
    const EYE_RIGHT_LINEpositions =
      EYE_RIGHT_LINE.geometry.attributes.position.array;
    const EAR_RIGHT_LINEpositions =
      EAR_RIGHT_LINE.geometry.attributes.position.array;
    const EYE_LEFT_LINEpositions =
      EYE_LEFT_LINE.geometry.attributes.position.array;
    const EAR_LEFT_LINEpositions =
      EAR_LEFT_LINE.geometry.attributes.position.array;

    const ANKLE_LEFT_PAD_LINEpositions =
      ANKLE_LEFT_PAD_LINE.geometry.attributes.position.array;
    const KNEE_LEFT_PAD_LINEpositions =
      KNEE_LEFT_PAD_LINE.geometry.attributes.position.array;
    const HIP_LEFT_PAD_LINEpositions =
      HIP_LEFT_PAD_LINE.geometry.attributes.position.array;
    const ANKLE_RIGHT_PAD_LINEpositions =
      ANKLE_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const KNEE_RIGHT_PAD_LINEpositions =
      KNEE_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const HIP_RIGHT_PAD_LINEpositions =
      HIP_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const HAND_HANDTIP_RIGHT_PAD_LINEpositions =
      HAND_HANDTIP_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const HAND_HANDTIP_LEFT_PAD_LINEpositions =
      HAND_HANDTIP_LEFT_PAD_LINE.geometry.attributes.position.array;
    const HANDTIP_THUMB_RIGHT_PAD_LINEpositions =
      HANDTIP_THUMB_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const HANDTIP_THUMB_LEFT_PAD_LINEpositions =
      HANDTIP_THUMB_LEFT_PAD_LINE.geometry.attributes.position.array;
    const THUMB_HANDTIP_HAND_RIGHT_PAD_LINEpositions =
      THUMB_HANDTIP_HAND_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const THUMB_HANDTIP_HAND_LEFT_PAD_LINEpositions =
      THUMB_HANDTIP_HAND_LEFT_PAD_LINE.geometry.attributes.position.array;
    const NECK_EAR_CLAVICLE_RIGHT_PAD_LINEpositions =
      NECK_EAR_CLAVICLE_RIGHT_PAD_LINE.geometry.attributes.position.array;
    const NECK_EAR_CLAVICLE_LEFT_PAD_LINEpositions =
      NECK_EAR_CLAVICLE_LEFT_PAD_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_1_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_1_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_2_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_2_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_3_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_3_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_4_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_4_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_5_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_5_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINEpositions =
      FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE.geometry.attributes.position.array;
    const FOOT_LEFT_PAD_EDGE_TOP_6_LINEpositions =
      FOOT_LEFT_PAD_EDGE_TOP_6_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_1_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_1_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_2_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_2_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_3_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_3_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_4_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_4_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_5_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_5_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE.geometry.attributes.position.array;
    const FOOT_RIGHT_PAD_EDGE_TOP_6_LINEpositions =
      FOOT_RIGHT_PAD_EDGE_TOP_6_LINE.geometry.attributes.position.array;
    const ARM_LEFT_TOP_PAD_1_LINEpositions =
      ARM_LEFT_TOP_PAD_1_LINE.geometry.attributes.position.array;
    const ARM_LEFT_TOP_PAD_2_LINEpositions =
      ARM_LEFT_TOP_PAD_2_LINE.geometry.attributes.position.array;
    const ARM_LEFT_TOP_PAD_3_LINEpositions =
      ARM_LEFT_TOP_PAD_3_LINE.geometry.attributes.position.array;
    const ARM_LEFT_TOP_PAD_4_LINEpositions =
      ARM_LEFT_TOP_PAD_4_LINE.geometry.attributes.position.array;
    const ARM_LEFT_BOTTOM_PAD_1_LINEpositions =
      ARM_LEFT_BOTTOM_PAD_1_LINE.geometry.attributes.position.array;
    const ARM_LEFT_BOTTOM_PAD_2_LINEpositions =
      ARM_LEFT_BOTTOM_PAD_2_LINE.geometry.attributes.position.array;
    const ARM_LEFT_BOTTOM_PAD_3_LINEpositions =
      ARM_LEFT_BOTTOM_PAD_3_LINE.geometry.attributes.position.array;
    const ARM_LEFT_BOTTOM_PAD_4_LINEpositions =
      ARM_LEFT_BOTTOM_PAD_4_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_TOP_PAD_1_LINEpositions =
      ARM_RIGHT_TOP_PAD_1_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_TOP_PAD_2_LINEpositions =
      ARM_RIGHT_TOP_PAD_2_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_TOP_PAD_3_LINEpositions =
      ARM_RIGHT_TOP_PAD_3_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_TOP_PAD_4_LINEpositions =
      ARM_RIGHT_TOP_PAD_4_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_BOTTOM_PAD_1_LINEpositions =
      ARM_RIGHT_BOTTOM_PAD_1_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_BOTTOM_PAD_2_LINEpositions =
      ARM_RIGHT_BOTTOM_PAD_2_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_BOTTOM_PAD_3_LINEpositions =
      ARM_RIGHT_BOTTOM_PAD_3_LINE.geometry.attributes.position.array;
    const ARM_RIGHT_BOTTOM_PAD_4_LINEpositions =
      ARM_RIGHT_BOTTOM_PAD_4_LINE.geometry.attributes.position.array;

    //////

    update(
      PELVIS_LINEpositions[1],
      ((data[24].y + data[23].y) / 2) * multiplier,
      PELVIS_LINE
    );
    PELVIS_LINE.geometry.attributes.position.needsUpdate = true;

    update(
      HEAD_LINEpositions[1],
      ((data[10].y + data[9].y) / 2) * multiplier,
      HEAD_LINE
    ); // [9] and [10] average //it will be to calculate "neck"
    update(NECK_LINEpositions[1], shoulderneckavg * multiplier, NECK_LINE);
    update(
      SPINE_CHEST_LINEpositions[1],
      ((shoulderneckavg + neckpelvisavg) / 2) * multiplier,
      SPINE_CHEST_LINE
    ); //maybe that's supposed to be neck????
    update(
      SPINE_NAVAL_LINEpositions[1],
      ((pelvisavg + neckpelvisavg) / 2) * multiplier,
      SPINE_NAVAL_LINE
    );
    update(NOSE_LINEpositions[1], data[0].y * multiplier, NOSE_LINE); //[0]
    update(
      CLAVICLE_RIGHT_LINEpositions[1],
      ((shoulderneckavg + data[11].y) / 2) * multiplier,
      CLAVICLE_RIGHT_LINE
    );
    update(
      CLAVICLE_LEFT_LINEpositions[1],
      ((shoulderneckavg + data[12].y) / 2) * multiplier,
      CLAVICLE_LEFT_LINE
    );
    update(
      SHOULDER_RIGHT_LINEpositions[1],
      data[11].y * multiplier,
      SHOULDER_RIGHT_LINE
    );
    update(
      ELBOW_RIGHT_LINEpositions[1],
      data[13].y * multiplier,
      ELBOW_RIGHT_LINE
    );
    update(
      WRIST_RIGHT_LINEpositions[1],
      data[15].y * multiplier,
      WRIST_RIGHT_LINE
    );
    update(
      HAND_RIGHT_LINEpositions[1],
      ((data[19].y + data[15].y + data[17].y) / 3) * multiplier,
      HAND_RIGHT_LINE
    );
    update(
      HANDTIP_RIGHT_LINEpositions[1],
      data[19].y * multiplier,
      HANDTIP_RIGHT_LINE
    );
    update(
      THUMB_RIGHT_LINEpositions[1],
      data[21].y * multiplier,
      THUMB_RIGHT_LINE
    );
    update(
      SHOULDER_LEFT_LINEpositions[1],
      data[12].y * multiplier,
      SHOULDER_LEFT_LINE
    );
    update(
      ELBOW_LEFT_LINEpositions[1],
      data[14].y * multiplier,
      ELBOW_LEFT_LINE
    );
    update(
      WRIST_LEFT_LINEpositions[1],
      data[16].y * multiplier,
      WRIST_LEFT_LINE
    );
    update(
      HAND_LEFT_LINEpositions[1],
      ((data[16].y + data[18].y + data[20].y) / 3) * multiplier,
      HAND_LEFT_LINE
    );
    update(
      HANDTIP_LEFT_LINEpositions[1],
      data[20].y * multiplier,
      HANDTIP_LEFT_LINE
    );
    update(
      THUMB_LEFT_LINEpositions[1],
      data[22].y * multiplier,
      THUMB_LEFT_LINE
    );
    update(
      KNEE_RIGHT_LINEpositions[1],
      data[25].y * multiplier,
      KNEE_RIGHT_LINE
    );
    update(
      ANKLE_RIGHT_LINEpositions[1],
      data[27].y * multiplier,
      ANKLE_RIGHT_LINE
    );
    update(
      FOOT_RIGHT_LINEpositions[1],
      data[31].y * multiplier,
      FOOT_RIGHT_LINE
    );
    update(HIP_RIGHT_LINEpositions[1], data[23].y * multiplier, HIP_RIGHT_LINE);
    update(HIP_LEFT_LINEpositions[1], data[24].y * multiplier, HIP_LEFT_LINE);
    update(KNEE_LEFT_LINEpositions[1], data[26].y * multiplier, KNEE_LEFT_LINE);
    update(
      ANKLE_LEFT_LINEpositions[1],
      data[28].y * multiplier,
      ANKLE_LEFT_LINE
    );
    update(FOOT_LEFT_LINEpositions[1], data[32].y * multiplier, FOOT_LEFT_LINE);
    update(
      EYE_RIGHT_LINEpositions[1],
      ((data[1].y + data[2].y + data[3].y) / 3) * multiplier,
      EYE_RIGHT_LINE
    );
    update(EAR_RIGHT_LINEpositions[1], data[7].y * multiplier, EAR_RIGHT_LINE);
    update(
      EYE_LEFT_LINEpositions[1],
      ((data[6].y + data[5].y + data[4].y) / 3) * multiplier,
      EYE_LEFT_LINE
    );
    update(EAR_LEFT_LINEpositions[1], data[8].y * multiplier, EAR_LEFT_LINE);
    /////////////////////////////////////////////////////////////////////////////

    //     ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    update(
      NECK_EAR_CLAVICLE_LEFT_PAD_LINEpositions[1],
      (CLAVICLE_LEFT.position.y + EAR_LEFT.position.y + NECK.position.y) / 3,
      NECK_EAR_CLAVICLE_LEFT_PAD_LINE
    );
    update(
      NECK_EAR_CLAVICLE_RIGHT_PAD_LINEpositions[1],
      (CLAVICLE_RIGHT.position.y + EAR_RIGHT.position.y + NECK.position.y) / 3,
      NECK_EAR_CLAVICLE_RIGHT_PAD_LINE
    );

    update(
      HAND_HANDTIP_LEFT_PAD_LINEpositions[1],
      (HAND_LEFT.position.y + HANDTIP_LEFT.position.y) / 2,
      HAND_HANDTIP_LEFT_PAD_LINE
    );
    update(
      HANDTIP_THUMB_LEFT_PAD_LINEpositions[1],
      (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y) / 2,
      HANDTIP_THUMB_LEFT_PAD_LINE
    );
    update(
      THUMB_HANDTIP_HAND_LEFT_PAD_LINEpositions[1],
      (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y + HAND_LEFT.position.y) /
        3,
      THUMB_HANDTIP_HAND_LEFT_PAD_LINE
    );

    update(
      HAND_HANDTIP_RIGHT_PAD_LINEpositions[1],
      (HAND_RIGHT.position.y + HANDTIP_RIGHT.position.y) / 2,
      HAND_HANDTIP_RIGHT_PAD_LINE
    );
    update(
      HANDTIP_THUMB_RIGHT_PAD_LINEpositions[1],
      (HANDTIP_RIGHT.position.y + THUMB_RIGHT.position.y) / 2,
      HANDTIP_THUMB_RIGHT_PAD_LINE
    );
    update(
      THUMB_HANDTIP_HAND_RIGHT_PAD_LINEpositions[1],
      (HANDTIP_RIGHT.position.y +
        THUMB_RIGHT.position.y +
        HAND_RIGHT.position.y) /
        3,
      THUMB_HANDTIP_HAND_RIGHT_PAD_LINE
    );

    update(
      ANKLE_LEFT_PAD_LINEpositions[1],
      (ANKLE_LEFT.position.y + FOOT_LEFT.position.y) / 2,
      ANKLE_LEFT_PAD_LINE
    );
    update(
      KNEE_LEFT_PAD_LINEpositions[1],
      (ANKLE_LEFT.position.y + KNEE_LEFT.position.y) / 2,
      KNEE_LEFT_PAD_LINE
    );
    update(
      HIP_LEFT_PAD_LINEpositions[1],
      (HIP_LEFT.position.y + KNEE_LEFT.position.y) / 2,
      HIP_LEFT_PAD_LINE
    );

    update(
      ANKLE_RIGHT_PAD_LINEpositions[1],
      (ANKLE_RIGHT.position.y + FOOT_RIGHT.position.y) / 2,
      ANKLE_RIGHT_PAD_LINE
    );
    update(
      KNEE_RIGHT_PAD_LINEpositions[1],
      (ANKLE_RIGHT.position.y + KNEE_RIGHT.position.y) / 2,
      KNEE_RIGHT_PAD_LINE
    );
    update(
      HIP_RIGHT_PAD_LINEpositions[1],
      (HIP_RIGHT.position.y + KNEE_RIGHT.position.y) / 2,
      HIP_RIGHT_PAD_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_LINEpositions[1],
      HAND_HANDTIP_LEFT_PAD.position.y +
        0.66666 * (FOOT_LEFT.position.y - HAND_HANDTIP_LEFT_PAD.position.y),
      FOOT_LEFT_PAD_EDGE_BOTTOM_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_TOP_LINEpositions[1],
      HAND_HANDTIP_LEFT_PAD.position.y +
        0.33333 * (FOOT_LEFT.position.y - HAND_HANDTIP_LEFT_PAD.position.y),
      FOOT_LEFT_PAD_EDGE_TOP_LINE
    );

    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_LINEpositions[1],
      HAND_HANDTIP_RIGHT_PAD.position.y +
        0.66666 * (FOOT_RIGHT.position.y - HAND_HANDTIP_RIGHT_PAD.position.y),
      FOOT_RIGHT_PAD_EDGE_BOTTOM_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_LINEpositions[1],
      HAND_HANDTIP_RIGHT_PAD.position.y +
        0.33333 * (FOOT_RIGHT.position.y - HAND_HANDTIP_RIGHT_PAD.position.y),
      FOOT_RIGHT_PAD_EDGE_TOP_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINEpositions[1],
      HAND_LEFT.position.y +
        0.66666 * (ANKLE_LEFT_PAD.position.y - HAND_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_BOTTOM_1_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_TOP_1_LINEpositions[1],
      HAND_LEFT.position.y +
        0.33333 * (ANKLE_LEFT_PAD.position.y - HAND_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_TOP_1_LINE
    );

    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINEpositions[1],
      HAND_RIGHT.position.y +
        0.66666 * (ANKLE_RIGHT_PAD.position.y - HAND_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_BOTTOM_1_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_1_LINEpositions[1],
      HAND_RIGHT.position.y +
        0.33333 * (ANKLE_RIGHT_PAD.position.y - HAND_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_TOP_1_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINEpositions[1],
      WRIST_LEFT.position.y +
        0.66666 * (ANKLE_LEFT.position.y - WRIST_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_BOTTOM_2_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_TOP_2_LINEpositions[1],
      WRIST_LEFT.position.y +
        0.33333 * (ANKLE_LEFT.position.y - WRIST_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_TOP_2_LINE
    );

    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINEpositions[1],
      WRIST_RIGHT.position.y +
        0.66666 * (ANKLE_RIGHT.position.y - WRIST_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_BOTTOM_2_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_2_LINEpositions[1],
      WRIST_RIGHT.position.y +
        0.33333 * (ANKLE_RIGHT.position.y - WRIST_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_TOP_2_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINEpositions[1],
      ELBOW_LEFT.position.y +
        0.66666 * (KNEE_LEFT_PAD.position.y - ELBOW_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_BOTTOM_3_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_TOP_3_LINEpositions[1],
      ELBOW_LEFT.position.y +
        0.33333 * (KNEE_LEFT_PAD.position.y - ELBOW_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_TOP_3_LINE
    );

    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINEpositions[1],
      ELBOW_RIGHT.position.y +
        0.66666 * (KNEE_RIGHT_PAD.position.y - ELBOW_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_BOTTOM_3_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_3_LINEpositions[1],
      ELBOW_RIGHT.position.y +
        0.33333 * (KNEE_RIGHT_PAD.position.y - ELBOW_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_TOP_3_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINEpositions[1],
      SHOULDER_LEFT.position.y +
        0.66666 * (KNEE_LEFT.position.y - SHOULDER_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_BOTTOM_4_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_TOP_4_LINEpositions[1],
      SHOULDER_LEFT.position.y +
        0.33333 * (KNEE_LEFT.position.y - SHOULDER_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_TOP_4_LINE
    );

    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINEpositions[1],
      SHOULDER_RIGHT.position.y +
        0.66666 * (KNEE_RIGHT.position.y - SHOULDER_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_BOTTOM_4_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_4_LINEpositions[1],
      SHOULDER_RIGHT.position.y +
        0.33333 * (KNEE_RIGHT.position.y - SHOULDER_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_TOP_4_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINEpositions[1],
      CLAVICLE_LEFT.position.y +
        0.66666 * (HIP_LEFT_PAD.position.y - CLAVICLE_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_BOTTOM_5_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_TOP_5_LINEpositions[1],
      CLAVICLE_LEFT.position.y +
        0.33333 * (HIP_LEFT_PAD.position.y - CLAVICLE_LEFT.position.y),
      FOOT_LEFT_PAD_EDGE_TOP_5_LINE
    );

    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINEpositions[1],
      CLAVICLE_RIGHT.position.y +
        0.66666 * (HIP_RIGHT_PAD.position.y - CLAVICLE_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_BOTTOM_5_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_5_LINEpositions[1],
      CLAVICLE_RIGHT.position.y +
        0.33333 * (HIP_RIGHT_PAD.position.y - CLAVICLE_RIGHT.position.y),
      FOOT_RIGHT_PAD_EDGE_TOP_5_LINE
    );

    update(
      FOOT_LEFT_PAD_EDGE_TOP_6_LINEpositions[1],
      (FOOT_LEFT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y) / 2,
      FOOT_LEFT_PAD_EDGE_TOP_6_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_TOP_6_LINEpositions[1],
      (FOOT_RIGHT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y) / 2,
      FOOT_RIGHT_PAD_EDGE_TOP_6_LINE
    );
    update(
      FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINEpositions[1],
      (FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y) / 2,
      FOOT_LEFT_PAD_EDGE_BOTTOM_6_LINE
    );
    update(
      FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINEpositions[1],
      (FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y) / 2,
      FOOT_RIGHT_PAD_EDGE_BOTTOM_6_LINE
    );

    update(
      ARM_LEFT_TOP_PAD_1_LINEpositions[1],
      THUMB_LEFT.position.y +
        0.2 * (EYE_LEFT.position.y - THUMB_LEFT.position.y),
      ARM_LEFT_TOP_PAD_1_LINE
    );
    update(
      ARM_LEFT_TOP_PAD_2_LINEpositions[1],
      THUMB_LEFT.position.y +
        0.4 * (EYE_LEFT.position.y - THUMB_LEFT.position.y),
      ARM_LEFT_TOP_PAD_2_LINE
    );
    update(
      ARM_LEFT_TOP_PAD_3_LINEpositions[1],
      THUMB_LEFT.position.y +
        0.6 * (EYE_LEFT.position.y - THUMB_LEFT.position.y),
      ARM_LEFT_TOP_PAD_3_LINE
    );
    update(
      ARM_LEFT_TOP_PAD_4_LINEpositions[1],
      THUMB_LEFT.position.y +
        0.8 * (EYE_LEFT.position.y - THUMB_LEFT.position.y),
      ARM_LEFT_TOP_PAD_4_LINE
    );

    update(
      ARM_RIGHT_TOP_PAD_1_LINEpositions[1],
      THUMB_RIGHT.position.y +
        0.2 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y),
      ARM_RIGHT_TOP_PAD_1_LINE
    );
    update(
      ARM_RIGHT_TOP_PAD_2_LINEpositions[1],
      THUMB_RIGHT.position.y +
        0.4 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y),
      ARM_RIGHT_TOP_PAD_2_LINE
    );
    update(
      ARM_RIGHT_TOP_PAD_3_LINEpositions[1],
      THUMB_RIGHT.position.y +
        0.6 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y),
      ARM_RIGHT_TOP_PAD_3_LINE
    );
    update(
      ARM_RIGHT_TOP_PAD_4_LINEpositions[1],
      THUMB_RIGHT.position.y +
        0.8 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y),
      ARM_RIGHT_TOP_PAD_4_LINE
    );

    update(
      ARM_LEFT_BOTTOM_PAD_1_LINEpositions[1],
      (ARM_LEFT_TOP_PAD_1.position.y +
        WRIST_LEFT.position.y +
        THUMB_HANDTIP_HAND_LEFT_PAD.position.y) /
        3,
      ARM_LEFT_BOTTOM_PAD_1_LINE
    );
    update(
      ARM_LEFT_BOTTOM_PAD_2_LINEpositions[1],
      (ARM_LEFT_TOP_PAD_2.position.y +
        ELBOW_LEFT.position.y +
        ARM_LEFT_BOTTOM_PAD_1.position.y) /
        3,
      ARM_LEFT_BOTTOM_PAD_2_LINE
    );
    update(
      ARM_LEFT_BOTTOM_PAD_3_LINEpositions[1],
      (ARM_LEFT_TOP_PAD_3.position.y +
        SHOULDER_LEFT.position.y +
        ARM_LEFT_BOTTOM_PAD_2.position.y) /
        3,
      ARM_LEFT_BOTTOM_PAD_3_LINE
    );
    update(
      ARM_LEFT_BOTTOM_PAD_4_LINEpositions[1],
      (ARM_LEFT_TOP_PAD_4.position.y +
        CLAVICLE_LEFT.position.y +
        ARM_LEFT_BOTTOM_PAD_3.position.y +
        EAR_LEFT.position.y) /
        4,
      ARM_LEFT_BOTTOM_PAD_4_LINE
    );

    update(
      ARM_RIGHT_BOTTOM_PAD_1_LINEpositions[1],
      (ARM_RIGHT_TOP_PAD_1.position.y +
        WRIST_RIGHT.position.y +
        THUMB_HANDTIP_HAND_RIGHT_PAD.position.y) /
        3,
      ARM_RIGHT_BOTTOM_PAD_1_LINE
    );
    update(
      ARM_RIGHT_BOTTOM_PAD_2_LINEpositions[1],
      (ARM_RIGHT_TOP_PAD_2.position.y +
        ELBOW_RIGHT.position.y +
        ARM_RIGHT_BOTTOM_PAD_1.position.y) /
        3,
      ARM_RIGHT_BOTTOM_PAD_2_LINE
    );
    update(
      ARM_RIGHT_BOTTOM_PAD_3_LINEpositions[1],
      (ARM_RIGHT_TOP_PAD_3.position.y +
        SHOULDER_RIGHT.position.y +
        ARM_RIGHT_BOTTOM_PAD_2.position.y) /
        3,
      ARM_RIGHT_BOTTOM_PAD_3_LINE
    );
    update(
      ARM_RIGHT_BOTTOM_PAD_4_LINEpositions[1],
      (ARM_RIGHT_TOP_PAD_4.position.y +
        CLAVICLE_RIGHT.position.y +
        ARM_RIGHT_BOTTOM_PAD_3.position.y +
        EAR_RIGHT.position.y) /
        4,
      ARM_RIGHT_BOTTOM_PAD_4_LINE
    );

    for (var i = 0; i < positions.length; i++) {
      // console.log(data)
      // console.log(positions)
      // positions[i].geometry.attributes.position.array[1] = data[i].y
      positions[i].geometry.attributes.position.needsUpdate = true;
    }
  }
}

class node {
  constructor(name) {
    this.name = name;
  }
  // Method
  update(name, positionY) {
    // console.log(name, positionY, scene.getObjectByName(name).position.y)
    let diff =
      Math.abs(positionY) - Math.abs(scene.getObjectByName(name).position.y);
    for (var i = 0; i < 3; i++) {
      scene.getObjectByName(name).position.y = positionY + diff * (i / 3);
    }
  }
}

let HANDTIP_THUMB_LEFT_PADnode = new node("HANDTIP_THUMB_LEFT_PAD");
let THUMB_LEFTnode = new node("THUMB_LEFT");
let ARM_LEFT_TOP_PAD_1node = new node("ARM_LEFT_TOP_PAD_1");
let ARM_LEFT_TOP_PAD_2node = new node("ARM_LEFT_TOP_PAD_2");
let ARM_LEFT_TOP_PAD_3node = new node("ARM_LEFT_TOP_PAD_3");
let ARM_LEFT_TOP_PAD_4node = new node("ARM_LEFT_TOP_PAD_4");
let EYE_LEFTnode = new node("EYE_LEFT");
let NOSEnode = new node("NOSE");
let EYE_RIGHTnode = new node("EYE_RIGHT");
let ARM_RIGHT_TOP_PAD_4node = new node("ARM_RIGHT_TOP_PAD_4");
let ARM_RIGHT_TOP_PAD_3node = new node("ARM_RIGHT_TOP_PAD_3");
let ARM_RIGHT_TOP_PAD_2node = new node("ARM_RIGHT_TOP_PAD_2");
let ARM_RIGHT_TOP_PAD_1node = new node("ARM_RIGHT_TOP_PAD_1");
let THUMB_RIGHTnode = new node("THUMB_RIGHT");
let HANDTIP_THUMB_RIGHT_PADnode = new node("HANDTIP_THUMB_RIGHT_PAD");
let HANDTIP_LEFTnode = new node("HANDTIP_LEFT");
let THUMB_HANDTIP_HAND_LEFT_PADnode = new node("THUMB_HANDTIP_HAND_LEFT_PAD");
let ARM_LEFT_BOTTOM_PAD_1node = new node("ARM_LEFT_BOTTOM_PAD_1");
let ARM_LEFT_BOTTOM_PAD_2node = new node("ARM_LEFT_BOTTOM_PAD_2");
let ARM_LEFT_BOTTOM_PAD_3node = new node("ARM_LEFT_BOTTOM_PAD_3");
let ARM_LEFT_BOTTOM_PAD_4node = new node("ARM_LEFT_BOTTOM_PAD_4");
let EAR_LEFTnode = new node("EAR_LEFT");
let HEADnode = new node("HEAD");
let EAR_RIGHTnode = new node("EAR_RIGHT");
let ARM_RIGHT_BOTTOM_PAD_4node = new node("ARM_RIGHT_BOTTOM_PAD_4");
let ARM_RIGHT_BOTTOM_PAD_3node = new node("ARM_RIGHT_BOTTOM_PAD_3");
let ARM_RIGHT_BOTTOM_PAD_2node = new node("ARM_RIGHT_BOTTOM_PAD_2");
let ARM_RIGHT_BOTTOM_PAD_1node = new node("ARM_RIGHT_BOTTOM_PAD_1");
let THUMB_HANDTIP_HAND_RIGHT_PADnode = new node("THUMB_HANDTIP_HAND_RIGHT_PAD");
let HANDTIP_RIGHTnode = new node("HANDTIP_RIGHT");
let HAND_HANDTIP_LEFT_PADnode = new node("HAND_HANDTIP_LEFT_PAD");
let HAND_LEFTnode = new node("HAND_LEFT");
let WRIST_LEFTnode = new node("WRIST_LEFT");
let ELBOW_LEFTnode = new node("ELBOW_LEFT");
let SHOULDER_LEFTnode = new node("SHOULDER_LEFT");
let CLAVICLE_LEFTnode = new node("CLAVICLE_LEFT");
let NECK_EAR_CLAVICLE_LEFT_PADnode = new node("NECK_EAR_CLAVICLE_LEFT_PAD");
let NECKnode = new node("NECK");
let NECK_EAR_CLAVICLE_RIGHT_PADnode = new node("NECK_EAR_CLAVICLE_RIGHT_PAD");
let CLAVICLE_RIGHTnode = new node("CLAVICLE_RIGHT");
let SHOULDER_RIGHTnode = new node("SHOULDER_RIGHT");
let ELBOW_RIGHTnode = new node("ELBOW_RIGHT");
let WRIST_RIGHTnode = new node("WRIST_RIGHT");
let HAND_RIGHTnode = new node("HAND_RIGHT");
let HAND_HANDTIP_RIGHT_PADnode = new node("HAND_HANDTIP_RIGHT_PAD");
let FOOT_LEFT_PAD_EDGE_TOPnode = new node("FOOT_LEFT_PAD_EDGE_TOP");
let FOOT_LEFT_PAD_EDGE_TOP_1node = new node("FOOT_LEFT_PAD_EDGE_TOP_1");
let FOOT_LEFT_PAD_EDGE_TOP_2node = new node("FOOT_LEFT_PAD_EDGE_TOP_2");
let FOOT_LEFT_PAD_EDGE_TOP_3node = new node("FOOT_LEFT_PAD_EDGE_TOP_3");
let FOOT_LEFT_PAD_EDGE_TOP_4node = new node("FOOT_LEFT_PAD_EDGE_TOP_4");
let FOOT_LEFT_PAD_EDGE_TOP_5node = new node("FOOT_LEFT_PAD_EDGE_TOP_5");
let FOOT_LEFT_PAD_EDGE_TOP_6node = new node("FOOT_LEFT_PAD_EDGE_TOP_6");
let SPINE_CHESTnode = new node("SPINE_CHEST");
let FOOT_RIGHT_PAD_EDGE_TOP_6node = new node("FOOT_RIGHT_PAD_EDGE_TOP_6");
let FOOT_RIGHT_PAD_EDGE_TOP_5node = new node("FOOT_RIGHT_PAD_EDGE_TOP_5");
let FOOT_RIGHT_PAD_EDGE_TOP_4node = new node("FOOT_RIGHT_PAD_EDGE_TOP_4");
let FOOT_RIGHT_PAD_EDGE_TOP_3node = new node("FOOT_RIGHT_PAD_EDGE_TOP_3");
let FOOT_RIGHT_PAD_EDGE_TOP_2node = new node("FOOT_RIGHT_PAD_EDGE_TOP_2");
let FOOT_RIGHT_PAD_EDGE_TOP_1node = new node("FOOT_RIGHT_PAD_EDGE_TOP_1");
let FOOT_RIGHT_PAD_EDGE_TOPnode = new node("FOOT_RIGHT_PAD_EDGE_TOP");
let FOOT_LEFT_PAD_EDGE_BOTTOMnode = new node("FOOT_LEFT_PAD_EDGE_BOTTOM");
let FOOT_LEFT_PAD_EDGE_BOTTOM_1node = new node("FOOT_LEFT_PAD_EDGE_BOTTOM_1");
let FOOT_LEFT_PAD_EDGE_BOTTOM_2node = new node("FOOT_LEFT_PAD_EDGE_BOTTOM_2");
let FOOT_LEFT_PAD_EDGE_BOTTOM_3node = new node("FOOT_LEFT_PAD_EDGE_BOTTOM_3");
let FOOT_LEFT_PAD_EDGE_BOTTOM_4node = new node("FOOT_LEFT_PAD_EDGE_BOTTOM_4");
let FOOT_LEFT_PAD_EDGE_BOTTOM_5node = new node("FOOT_LEFT_PAD_EDGE_BOTTOM_5");
let FOOT_LEFT_PAD_EDGE_BOTTOM_6node = new node("FOOT_LEFT_PAD_EDGE_BOTTOM_6");
let SPINE_NAVALnode = new node("SPINE_NAVAL");
let FOOT_RIGHT_PAD_EDGE_BOTTOM_6node = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM_6");
let FOOT_RIGHT_PAD_EDGE_BOTTOM_5node = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM_5");
let FOOT_RIGHT_PAD_EDGE_BOTTOM_4node = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM_4");
let FOOT_RIGHT_PAD_EDGE_BOTTOM_3node = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM_3");
let FOOT_RIGHT_PAD_EDGE_BOTTOM_2node = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM_2");
let FOOT_RIGHT_PAD_EDGE_BOTTOM_1node = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM_1");
let FOOT_RIGHT_PAD_EDGE_BOTTOMnode = new node("FOOT_RIGHT_PAD_EDGE_BOTTOM");
let FOOT_LEFTnode = new node("FOOT_LEFT");
let ANKLE_LEFT_PADnode = new node("ANKLE_LEFT_PAD");
let ANKLE_LEFTnode = new node("ANKLE_LEFT");
let KNEE_LEFT_PADnode = new node("KNEE_LEFT_PAD");
let KNEE_LEFTnode = new node("KNEE_LEFT");
let HIP_LEFT_PADnode = new node("HIP_LEFT_PAD");
let HIP_LEFTnode = new node("HIP_LEFT");
let PELVISnode = new node("PELVIS");
let HIP_RIGHTnode = new node("HIP_RIGHT");
let HIP_RIGHT_PADnode = new node("HIP_RIGHT_PAD");
let KNEE_RIGHTnode = new node("KNEE_RIGHT");
let KNEE_RIGHT_PADnode = new node("KNEE_RIGHT_PAD");
let ANKLE_RIGHTnode = new node("ANKLE_RIGHT");
let ANKLE_RIGHT_PADnode = new node("ANKLE_RIGHT_PAD");
let FOOT_RIGHTnode = new node("FOOT_RIGHT");

function updateSpheres(data) {
  // console.log(data[0])
  if (data) {
    let multiplier = -15;
    window.multiplier = multiplier;

    let shoulderavg = (data[12].y + data[11].y) / 2;
    let heady = (data[10].y + data[9].y) / 2;
    let shoulderneckavg = (shoulderavg + heady) / 2;
    let pelvisavg = (data[24].y + data[23].y) / 2;
    let neckpelvisavg = (shoulderneckavg + pelvisavg) / 2;

    PELVISnode.update("PELVIS", ((data[24].y + data[23].y) / 2) * multiplier); //good)
    HEADnode.update("HEAD", ((data[10].y + data[9].y) / 2) * multiplier); // [9] and [10] average //it will be to calculate "neck")
    NECKnode.update("NECK", shoulderneckavg * multiplier);
    SPINE_CHESTnode.update(
      "SPINE_CHEST",
      ((shoulderneckavg + neckpelvisavg) / 2) * multiplier
    ); //maybe that's supposed to be neck????)
    SPINE_NAVALnode.update(
      "SPINE_NAVAL",
      ((pelvisavg + neckpelvisavg) / 2) * multiplier
    );
    NOSEnode.update("NOSE", data[0].y * multiplier); //[0])

    CLAVICLE_RIGHTnode.update(
      "CLAVICLE_RIGHT",
      ((shoulderneckavg + data[11].y) / 2) * multiplier
    );
    CLAVICLE_LEFTnode.update(
      "CLAVICLE_LEFT",
      ((shoulderneckavg + data[12].y) / 2) * multiplier
    );

    SHOULDER_RIGHTnode.update("SHOULDER_RIGHT", data[11].y * multiplier);

    ELBOW_RIGHTnode.update("ELBOW_RIGHT", data[13].y * multiplier);
    WRIST_RIGHTnode.update("WRIST_RIGHT", data[15].y * multiplier);

    HAND_RIGHTnode.update(
      "HAND_RIGHT",
      ((data[19].y + data[15].y + data[17].y) / 3) * multiplier
    );

    HANDTIP_RIGHTnode.update("HANDTIP_RIGHT", data[19].y * multiplier);
    THUMB_RIGHTnode.update("THUMB_RIGHT", data[21].y * multiplier);

    SHOULDER_LEFTnode.update("SHOULDER_LEFT", data[12].y * multiplier);
    ELBOW_LEFTnode.update("ELBOW_LEFT", data[14].y * multiplier);

    WRIST_LEFTnode.update("WRIST_LEFT", data[16].y * multiplier);

    HAND_LEFTnode.update(
      "HAND_LEFT",
      ((data[16].y + data[18].y + data[20].y) / 3) * multiplier
    );

    HANDTIP_LEFTnode.update("HANDTIP_LEFT", data[20].y * multiplier);
    THUMB_LEFTnode.update("THUMB_LEFT", data[22].y * multiplier);

    KNEE_RIGHTnode.update("KNEE_RIGHT", data[25].y * multiplier);
    ANKLE_RIGHTnode.update("ANKLE_RIGHT", data[27].y * multiplier);
    FOOT_RIGHTnode.update("FOOT_RIGHT", data[31].y * multiplier);

    HIP_RIGHTnode.update("HIP_RIGHT", data[23].y * multiplier);
    HIP_LEFTnode.update("HIP_LEFT", data[24].y * multiplier);

    KNEE_LEFTnode.update("KNEE_LEFT", data[26].y * multiplier);
    ANKLE_LEFTnode.update("ANKLE_LEFT", data[28].y * multiplier);
    FOOT_LEFTnode.update("FOOT_LEFT", data[32].y * multiplier);

    EYE_RIGHTnode.update(
      "EYE_RIGHT",
      ((data[1].y + data[2].y + data[3].y) / 3) * multiplier
    );
    EAR_RIGHTnode.update("EAR_RIGHT", data[7].y * multiplier);

    EYE_LEFTnode.update(
      "EYE_LEFT",
      ((data[6].y + data[5].y + data[4].y) / 3) * multiplier
    );
    EAR_LEFTnode.update("EAR_LEFT", data[8].y * multiplier);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    NECK_EAR_CLAVICLE_LEFT_PADnode.update(
      "NECK_EAR_CLAVICLE_LEFT_PAD",
      (CLAVICLE_LEFT.position.y + EAR_LEFT.position.y + NECK.position.y) / 3
    );
    NECK_EAR_CLAVICLE_RIGHT_PADnode.update(
      "NECK_EAR_CLAVICLE_RIGHT_PAD",
      (CLAVICLE_RIGHT.position.y + EAR_RIGHT.position.y + NECK.position.y) / 3
    );

    HAND_HANDTIP_LEFT_PADnode.update(
      "HAND_HANDTIP_LEFT_PAD",
      (HAND_LEFT.position.y + HANDTIP_LEFT.position.y) / 2
    );
    HANDTIP_THUMB_LEFT_PADnode.update(
      "HANDTIP_THUMB_LEFT_PAD",
      (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y) / 2
    );
    THUMB_HANDTIP_HAND_LEFT_PADnode.update(
      "THUMB_HANDTIP_HAND_LEFT_PAD",
      (HANDTIP_LEFT.position.y + THUMB_LEFT.position.y + HAND_LEFT.position.y) /
        3
    );

    HAND_HANDTIP_RIGHT_PADnode.update(
      "HAND_HANDTIP_RIGHT_PAD",
      (HAND_RIGHT.position.y + HANDTIP_RIGHT.position.y) / 2
    );
    HANDTIP_THUMB_RIGHT_PADnode.update(
      "HANDTIP_THUMB_RIGHT_PAD",
      (HANDTIP_RIGHT.position.y + THUMB_RIGHT.position.y) / 2
    );
    THUMB_HANDTIP_HAND_RIGHT_PADnode.update(
      "THUMB_HANDTIP_HAND_RIGHT_PAD",
      (HANDTIP_RIGHT.position.y +
        THUMB_RIGHT.position.y +
        HAND_RIGHT.position.y) /
        3
    );

    ANKLE_LEFT_PADnode.update(
      "ANKLE_LEFT_PAD",
      (ANKLE_LEFT.position.y + FOOT_LEFT.position.y) / 2
    );
    KNEE_LEFT_PADnode.update(
      "KNEE_LEFT_PAD",
      (ANKLE_LEFT.position.y + KNEE_LEFT.position.y) / 2
    );
    HIP_LEFT_PADnode.update(
      "HIP_LEFT_PAD",
      (HIP_LEFT.position.y + KNEE_LEFT.position.y) / 2
    );

    ANKLE_RIGHT_PADnode.update(
      "ANKLE_RIGHT_PAD",
      (ANKLE_RIGHT.position.y + FOOT_RIGHT.position.y) / 2
    );
    KNEE_RIGHT_PADnode.update(
      "KNEE_RIGHT_PAD",
      (ANKLE_RIGHT.position.y + KNEE_RIGHT.position.y) / 2
    );
    HIP_RIGHT_PADnode.update(
      "HIP_RIGHT_PAD",
      (HIP_RIGHT.position.y + KNEE_RIGHT.position.y) / 2
    );

    FOOT_LEFT_PAD_EDGE_BOTTOMnode.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM",
      HAND_HANDTIP_LEFT_PAD.position.y +
        0.66666 * (FOOT_LEFT.position.y - HAND_HANDTIP_LEFT_PAD.position.y)
    );
    FOOT_LEFT_PAD_EDGE_TOPnode.update(
      "FOOT_LEFT_PAD_EDGE_TOP",
      HAND_HANDTIP_LEFT_PAD.position.y +
        0.33333 * (FOOT_LEFT.position.y - HAND_HANDTIP_LEFT_PAD.position.y)
    );

    FOOT_RIGHT_PAD_EDGE_BOTTOMnode.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM",
      HAND_HANDTIP_RIGHT_PAD.position.y +
        0.66666 * (FOOT_RIGHT.position.y - HAND_HANDTIP_RIGHT_PAD.position.y)
    );
    FOOT_RIGHT_PAD_EDGE_TOPnode.update(
      "FOOT_RIGHT_PAD_EDGE_TOP",
      HAND_HANDTIP_RIGHT_PAD.position.y +
        0.33333 * (FOOT_RIGHT.position.y - HAND_HANDTIP_RIGHT_PAD.position.y)
    );

    FOOT_LEFT_PAD_EDGE_BOTTOM_1node.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM_1",
      HAND_LEFT.position.y +
        0.66666 * (ANKLE_LEFT_PAD.position.y - HAND_LEFT.position.y)
    );
    FOOT_LEFT_PAD_EDGE_TOP_1node.update(
      "FOOT_LEFT_PAD_EDGE_TOP_1",
      HAND_LEFT.position.y +
        0.33333 * (ANKLE_LEFT_PAD.position.y - HAND_LEFT.position.y)
    );

    FOOT_RIGHT_PAD_EDGE_BOTTOM_1node.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM_1",
      HAND_RIGHT.position.y +
        0.66666 * (ANKLE_RIGHT_PAD.position.y - HAND_RIGHT.position.y)
    );
    FOOT_RIGHT_PAD_EDGE_TOP_1node.update(
      "FOOT_RIGHT_PAD_EDGE_TOP_1",
      HAND_RIGHT.position.y +
        0.33333 * (ANKLE_RIGHT_PAD.position.y - HAND_RIGHT.position.y)
    );

    FOOT_LEFT_PAD_EDGE_BOTTOM_2node.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM_2",
      WRIST_LEFT.position.y +
        0.66666 * (ANKLE_LEFT.position.y - WRIST_LEFT.position.y)
    );
    FOOT_LEFT_PAD_EDGE_TOP_2node.update(
      "FOOT_LEFT_PAD_EDGE_TOP_2",
      WRIST_LEFT.position.y +
        0.33333 * (ANKLE_LEFT.position.y - WRIST_LEFT.position.y)
    );

    FOOT_RIGHT_PAD_EDGE_BOTTOM_2node.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM_2",
      WRIST_RIGHT.position.y +
        0.66666 * (ANKLE_RIGHT.position.y - WRIST_RIGHT.position.y)
    );
    FOOT_RIGHT_PAD_EDGE_TOP_2node.update(
      "FOOT_RIGHT_PAD_EDGE_TOP_2",
      WRIST_RIGHT.position.y +
        0.33333 * (ANKLE_RIGHT.position.y - WRIST_RIGHT.position.y)
    );

    FOOT_LEFT_PAD_EDGE_BOTTOM_3node.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM_3",
      ELBOW_LEFT.position.y +
        0.66666 * (KNEE_LEFT_PAD.position.y - ELBOW_LEFT.position.y)
    );
    FOOT_LEFT_PAD_EDGE_TOP_3node.update(
      "FOOT_LEFT_PAD_EDGE_TOP_3",
      ELBOW_LEFT.position.y +
        0.33333 * (KNEE_LEFT_PAD.position.y - ELBOW_LEFT.position.y)
    );

    FOOT_RIGHT_PAD_EDGE_BOTTOM_3node.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM_3",
      ELBOW_RIGHT.position.y +
        0.66666 * (KNEE_RIGHT_PAD.position.y - ELBOW_RIGHT.position.y)
    );
    FOOT_RIGHT_PAD_EDGE_TOP_3node.update(
      "FOOT_RIGHT_PAD_EDGE_TOP_3",
      ELBOW_RIGHT.position.y +
        0.33333 * (KNEE_RIGHT_PAD.position.y - ELBOW_RIGHT.position.y)
    );

    FOOT_LEFT_PAD_EDGE_BOTTOM_4node.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM_4",
      SHOULDER_LEFT.position.y +
        0.66666 * (KNEE_LEFT.position.y - SHOULDER_LEFT.position.y)
    );
    FOOT_LEFT_PAD_EDGE_TOP_4node.update(
      "FOOT_LEFT_PAD_EDGE_TOP_4",
      SHOULDER_LEFT.position.y +
        0.33333 * (KNEE_LEFT.position.y - SHOULDER_LEFT.position.y)
    );

    FOOT_RIGHT_PAD_EDGE_BOTTOM_4node.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM_4",
      SHOULDER_RIGHT.position.y +
        0.66666 * (KNEE_RIGHT.position.y - SHOULDER_RIGHT.position.y)
    );
    FOOT_RIGHT_PAD_EDGE_TOP_4node.update(
      "FOOT_RIGHT_PAD_EDGE_TOP_4",
      SHOULDER_RIGHT.position.y +
        0.33333 * (KNEE_RIGHT.position.y - SHOULDER_RIGHT.position.y)
    );

    FOOT_LEFT_PAD_EDGE_BOTTOM_5node.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM_5",
      CLAVICLE_LEFT.position.y +
        0.66666 * (HIP_LEFT_PAD.position.y - CLAVICLE_LEFT.position.y)
    );
    FOOT_LEFT_PAD_EDGE_TOP_5node.update(
      "FOOT_LEFT_PAD_EDGE_TOP_5",
      CLAVICLE_LEFT.position.y +
        0.33333 * (HIP_LEFT_PAD.position.y - CLAVICLE_LEFT.position.y)
    );

    FOOT_RIGHT_PAD_EDGE_BOTTOM_5node.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM_5",
      CLAVICLE_RIGHT.position.y +
        0.66666 * (HIP_RIGHT_PAD.position.y - CLAVICLE_RIGHT.position.y)
    );
    FOOT_RIGHT_PAD_EDGE_TOP_5node.update(
      "FOOT_RIGHT_PAD_EDGE_TOP_5",
      CLAVICLE_RIGHT.position.y +
        0.33333 * (HIP_RIGHT_PAD.position.y - CLAVICLE_RIGHT.position.y)
    );

    FOOT_LEFT_PAD_EDGE_TOP_6node.update(
      "FOOT_LEFT_PAD_EDGE_TOP_6",
      (FOOT_LEFT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y) / 2
    );
    FOOT_RIGHT_PAD_EDGE_TOP_6node.update(
      "FOOT_RIGHT_PAD_EDGE_TOP_6",
      (FOOT_RIGHT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y) / 2
    );
    FOOT_LEFT_PAD_EDGE_BOTTOM_6node.update(
      "FOOT_LEFT_PAD_EDGE_BOTTOM_6",
      (FOOT_LEFT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y) / 2
    );
    FOOT_RIGHT_PAD_EDGE_BOTTOM_6node.update(
      "FOOT_RIGHT_PAD_EDGE_BOTTOM_6",
      (FOOT_RIGHT_PAD_EDGE_BOTTOM_5.position.y + SPINE_NAVAL.position.y) / 2
    );

    ARM_LEFT_TOP_PAD_1node.update(
      "ARM_LEFT_TOP_PAD_1",
      THUMB_LEFT.position.y +
        0.2 * (EYE_LEFT.position.y - THUMB_LEFT.position.y)
    );
    ARM_LEFT_TOP_PAD_2node.update(
      "ARM_LEFT_TOP_PAD_2",
      THUMB_LEFT.position.y +
        0.4 * (EYE_LEFT.position.y - THUMB_LEFT.position.y)
    );
    ARM_LEFT_TOP_PAD_3node.update(
      "ARM_LEFT_TOP_PAD_3",
      THUMB_LEFT.position.y +
        0.6 * (EYE_LEFT.position.y - THUMB_LEFT.position.y)
    );
    ARM_LEFT_TOP_PAD_4node.update(
      "ARM_LEFT_TOP_PAD_4",
      THUMB_LEFT.position.y +
        0.8 * (EYE_LEFT.position.y - THUMB_LEFT.position.y)
    );

    ARM_RIGHT_TOP_PAD_1node.update(
      "ARM_RIGHT_TOP_PAD_1",
      THUMB_RIGHT.position.y +
        0.2 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y)
    );
    ARM_RIGHT_TOP_PAD_2node.update(
      "ARM_RIGHT_TOP_PAD_2",
      THUMB_RIGHT.position.y +
        0.4 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y)
    );
    ARM_RIGHT_TOP_PAD_3node.update(
      "ARM_RIGHT_TOP_PAD_3",
      THUMB_RIGHT.position.y +
        0.6 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y)
    );
    ARM_RIGHT_TOP_PAD_4node.update(
      "ARM_RIGHT_TOP_PAD_4",
      THUMB_RIGHT.position.y +
        0.8 * (EYE_RIGHT.position.y - THUMB_RIGHT.position.y)
    );

    ARM_LEFT_BOTTOM_PAD_1node.update(
      "ARM_LEFT_BOTTOM_PAD_1",
      (ARM_LEFT_TOP_PAD_1.position.y +
        WRIST_LEFT.position.y +
        THUMB_HANDTIP_HAND_LEFT_PAD.position.y) /
        3
    );
    ARM_LEFT_BOTTOM_PAD_2node.update(
      "ARM_LEFT_BOTTOM_PAD_2",
      (ARM_LEFT_TOP_PAD_2.position.y +
        ELBOW_LEFT.position.y +
        ARM_LEFT_BOTTOM_PAD_1.position.y) /
        3
    );
    ARM_LEFT_BOTTOM_PAD_3node.update(
      "ARM_LEFT_BOTTOM_PAD_3",
      (ARM_LEFT_TOP_PAD_3.position.y +
        SHOULDER_LEFT.position.y +
        ARM_LEFT_BOTTOM_PAD_2.position.y) /
        3
    );
    ARM_LEFT_BOTTOM_PAD_4node.update(
      "ARM_LEFT_BOTTOM_PAD_4",
      (ARM_LEFT_TOP_PAD_4.position.y +
        CLAVICLE_LEFT.position.y +
        ARM_LEFT_BOTTOM_PAD_3.position.y +
        EAR_LEFT.position.y) /
        4
    );

    ARM_RIGHT_BOTTOM_PAD_1node.update(
      "ARM_RIGHT_BOTTOM_PAD_1",
      (ARM_RIGHT_TOP_PAD_1.position.y +
        WRIST_RIGHT.position.y +
        THUMB_HANDTIP_HAND_RIGHT_PAD.position.y) /
        3
    );
    ARM_RIGHT_BOTTOM_PAD_2node.update(
      "ARM_RIGHT_BOTTOM_PAD_2",
      (ARM_RIGHT_TOP_PAD_2.position.y +
        ELBOW_RIGHT.position.y +
        ARM_RIGHT_BOTTOM_PAD_1.position.y) /
        3
    );
    ARM_RIGHT_BOTTOM_PAD_3node.update(
      "ARM_RIGHT_BOTTOM_PAD_3",
      (ARM_RIGHT_TOP_PAD_3.position.y +
        SHOULDER_RIGHT.position.y +
        ARM_RIGHT_BOTTOM_PAD_2.position.y) /
        3
    );
    ARM_RIGHT_BOTTOM_PAD_4node.update(
      "ARM_RIGHT_BOTTOM_PAD_4",
      (ARM_RIGHT_TOP_PAD_4.position.y +
        CLAVICLE_RIGHT.position.y +
        ARM_RIGHT_BOTTOM_PAD_3.position.y +
        EAR_RIGHT.position.y) /
        4
    );

    drawLines(data, multiplier);
  }
}

function idle() {
  let positionsArr = [
    HANDTIP_THUMB_LEFT_PADnode,
    THUMB_LEFTnode,
    ARM_LEFT_TOP_PAD_1node,
    ARM_LEFT_TOP_PAD_2node,
    ARM_LEFT_TOP_PAD_3node,
    ARM_LEFT_TOP_PAD_4node,
    EYE_LEFTnode,
    NOSEnode,
    EYE_RIGHTnode,
    ARM_RIGHT_TOP_PAD_4node,
    ARM_RIGHT_TOP_PAD_3node,
    ARM_RIGHT_TOP_PAD_2node,
    ARM_RIGHT_TOP_PAD_1node,
    THUMB_RIGHTnode,
    HANDTIP_THUMB_RIGHT_PADnode,
    HANDTIP_LEFTnode,
    THUMB_HANDTIP_HAND_LEFT_PADnode,
    ARM_LEFT_BOTTOM_PAD_1node,
    ARM_LEFT_BOTTOM_PAD_2node,
    ARM_LEFT_BOTTOM_PAD_3node,
    ARM_LEFT_BOTTOM_PAD_4node,
    EAR_LEFTnode,
    HEADnode,
    EAR_RIGHTnode,
    ARM_RIGHT_BOTTOM_PAD_4node,
    ARM_RIGHT_BOTTOM_PAD_3node,
    ARM_RIGHT_BOTTOM_PAD_2node,
    ARM_RIGHT_BOTTOM_PAD_1node,
    THUMB_HANDTIP_HAND_RIGHT_PADnode,
    HANDTIP_RIGHTnode,
    HAND_HANDTIP_LEFT_PADnode,
    HAND_LEFTnode,
    WRIST_LEFTnode,
    ELBOW_LEFTnode,
    SHOULDER_LEFTnode,
    CLAVICLE_LEFTnode,
    NECK_EAR_CLAVICLE_LEFT_PADnode,
    NECKnode,
    NECK_EAR_CLAVICLE_RIGHT_PADnode,
    CLAVICLE_RIGHTnode,
    SHOULDER_RIGHTnode,
    ELBOW_RIGHTnode,
    WRIST_RIGHTnode,
    HAND_RIGHTnode,
    HAND_HANDTIP_RIGHT_PADnode,
    FOOT_LEFT_PAD_EDGE_TOPnode,
    FOOT_LEFT_PAD_EDGE_TOP_1node,
    FOOT_LEFT_PAD_EDGE_TOP_2node,
    FOOT_LEFT_PAD_EDGE_TOP_3node,
    FOOT_LEFT_PAD_EDGE_TOP_4node,
    FOOT_LEFT_PAD_EDGE_TOP_5node,
    FOOT_LEFT_PAD_EDGE_TOP_6node,
    SPINE_CHESTnode,
    FOOT_RIGHT_PAD_EDGE_TOP_6node,
    FOOT_RIGHT_PAD_EDGE_TOP_5node,
    FOOT_RIGHT_PAD_EDGE_TOP_4node,
    FOOT_RIGHT_PAD_EDGE_TOP_3node,
    FOOT_RIGHT_PAD_EDGE_TOP_2node,
    FOOT_RIGHT_PAD_EDGE_TOP_1node,
    FOOT_RIGHT_PAD_EDGE_TOPnode,
    FOOT_LEFT_PAD_EDGE_BOTTOMnode,
    FOOT_LEFT_PAD_EDGE_BOTTOM_1node,
    FOOT_LEFT_PAD_EDGE_BOTTOM_2node,
    FOOT_LEFT_PAD_EDGE_BOTTOM_3node,
    FOOT_LEFT_PAD_EDGE_BOTTOM_4node,
    FOOT_LEFT_PAD_EDGE_BOTTOM_5node,
    FOOT_LEFT_PAD_EDGE_BOTTOM_6node,
    SPINE_NAVALnode,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_6node,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_5node,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_4node,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_3node,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_2node,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_1node,
    FOOT_RIGHT_PAD_EDGE_BOTTOMnode,
    FOOT_LEFTnode,
    ANKLE_LEFT_PADnode,
    ANKLE_LEFTnode,
    KNEE_LEFT_PADnode,
    KNEE_LEFTnode,
    HIP_LEFT_PADnode,
    HIP_LEFTnode,
    PELVISnode,
    HIP_RIGHTnode,
    HIP_RIGHT_PADnode,
    KNEE_RIGHTnode,
    KNEE_RIGHT_PADnode,
    ANKLE_RIGHTnode,
    ANKLE_RIGHT_PADnode,
    FOOT_RIGHTnode,
  ];

  let positionsArr2 = [
    HANDTIP_THUMB_LEFT_PAD,
    THUMB_LEFT,
    ARM_LEFT_TOP_PAD_1,
    ARM_LEFT_TOP_PAD_2,
    ARM_LEFT_TOP_PAD_3,
    ARM_LEFT_TOP_PAD_4,
    EYE_LEFT,
    NOSE,
    EYE_RIGHT,
    ARM_RIGHT_TOP_PAD_4,
    ARM_RIGHT_TOP_PAD_3,
    ARM_RIGHT_TOP_PAD_2,
    ARM_RIGHT_TOP_PAD_1,
    THUMB_RIGHT,
    HANDTIP_THUMB_RIGHT_PAD,
    HANDTIP_LEFT,
    THUMB_HANDTIP_HAND_LEFT_PAD,
    ARM_LEFT_BOTTOM_PAD_1,
    ARM_LEFT_BOTTOM_PAD_2,
    ARM_LEFT_BOTTOM_PAD_3,
    ARM_LEFT_BOTTOM_PAD_4,
    EAR_LEFT,
    HEAD,
    EAR_RIGHT,
    ARM_RIGHT_BOTTOM_PAD_4,
    ARM_RIGHT_BOTTOM_PAD_3,
    ARM_RIGHT_BOTTOM_PAD_2,
    ARM_RIGHT_BOTTOM_PAD_1,
    THUMB_HANDTIP_HAND_RIGHT_PAD,
    HANDTIP_RIGHT,
    HAND_HANDTIP_LEFT_PAD,
    HAND_LEFT,
    WRIST_LEFT,
    ELBOW_LEFT,
    SHOULDER_LEFT,
    CLAVICLE_LEFT,
    NECK_EAR_CLAVICLE_LEFT_PAD,
    NECK,
    NECK_EAR_CLAVICLE_RIGHT_PAD,
    CLAVICLE_RIGHT,
    SHOULDER_RIGHT,
    ELBOW_RIGHT,
    WRIST_RIGHT,
    HAND_RIGHT,
    HAND_HANDTIP_RIGHT_PAD,
    FOOT_LEFT_PAD_EDGE_TOP,
    FOOT_LEFT_PAD_EDGE_TOP_1,
    FOOT_LEFT_PAD_EDGE_TOP_2,
    FOOT_LEFT_PAD_EDGE_TOP_3,
    FOOT_LEFT_PAD_EDGE_TOP_4,
    FOOT_LEFT_PAD_EDGE_TOP_5,
    FOOT_LEFT_PAD_EDGE_TOP_6,
    SPINE_CHEST,
    FOOT_RIGHT_PAD_EDGE_TOP_6,
    FOOT_RIGHT_PAD_EDGE_TOP_5,
    FOOT_RIGHT_PAD_EDGE_TOP_4,
    FOOT_RIGHT_PAD_EDGE_TOP_3,
    FOOT_RIGHT_PAD_EDGE_TOP_2,
    FOOT_RIGHT_PAD_EDGE_TOP_1,
    FOOT_RIGHT_PAD_EDGE_TOP,
    FOOT_LEFT_PAD_EDGE_BOTTOM,
    FOOT_LEFT_PAD_EDGE_BOTTOM_1,
    FOOT_LEFT_PAD_EDGE_BOTTOM_2,
    FOOT_LEFT_PAD_EDGE_BOTTOM_3,
    FOOT_LEFT_PAD_EDGE_BOTTOM_4,
    FOOT_LEFT_PAD_EDGE_BOTTOM_5,
    FOOT_LEFT_PAD_EDGE_BOTTOM_6,
    SPINE_NAVAL,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_6,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_5,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_4,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_3,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_2,
    FOOT_RIGHT_PAD_EDGE_BOTTOM_1,
    FOOT_RIGHT_PAD_EDGE_BOTTOM,
    FOOT_LEFT,
    ANKLE_LEFT_PAD,
    ANKLE_LEFT,
    KNEE_LEFT_PAD,
    KNEE_LEFT,
    HIP_LEFT_PAD,
    HIP_LEFT,
    PELVIS,
    HIP_RIGHT,
    HIP_RIGHT_PAD,
    KNEE_RIGHT,
    KNEE_RIGHT_PAD,
    ANKLE_RIGHT,
    ANKLE_RIGHT_PAD,
    FOOT_RIGHT,
  ];

  var time = Date.now() * 0.006;
  for (var i = 0; i < positionsArr.length; i++) {
    var child = positionsArr[i];
    var x = scene.getObjectByName(child.name).position.x;
    var z = scene.getObjectByName(child.name).position.z;
    var cycle = Math.sin(time * 0.01) * 0.3;

    child.update(
      child.name,
      Math.sin(time + x * (Math.sin(1519129853500 * 0.01) * 0.3)) *
        Math.cos(time * 0.5 + z * (Math.sin(1519129853500 * 0.01) * 0.3)) +
        2 -
        10
    );
    drawLines(positionsArr2, window.multiplier, true);
  }
}
