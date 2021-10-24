  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({canvas});
  let INTERSECTED = null
  const fov = 40;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 50000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  				const renderwidth = window.innerWidth;
				  const renderheight = window.innerHeight;
  renderer.setSize( renderwidth, renderheight );
  camera.position.set(0, 7, 20);

  const controls = new THREE.OrbitControls(camera, canvas);
  
  // controls.target.set(300, 302, 300);
  controls.target.set(0, 0, 0)
  // controls.enableZoom = false;
  
  // controls.enableDamping = true;
      controls.enableDamping = true;   //damping 
    controls.dampingFactor = 0.25;   //damping inertia
    controls.enableZoom = true;      //Zooming
  controls.maxZoom = 1;
    controls.autoRotate = true;       // enable rotation
    controls.maxPolarAngle = Math.PI / 2; // Limit angle of visibility
  
  
  controls.update();
  //custom renderpass


  
//   controls.noPan = true;
// // controls.maxDistance = controls.minDistance = yourfixeddistnace;  
// controls.noKeys = true;
// controls.noRotate = true;
// controls.noZoom = true;
	// renderer.setSize(window.innerWidth, window.innerHeight);
	// renderer.setPixelRatio(window.devicePixelRatio);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');

  function addLight(position) {
    const color = 0xFFFFFF;
    
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
    scene.add(light.target);
  }
  addLight([-3, 1, 1]);
  addLight([ 2, 1, .5]);


  const bodyRadiusTop = .2;
  const bodyRadiusBottom = .2;
  const bodyHeight = 2;
  const bodyRadialSegments = 6;
  const bodyGeometry = new THREE.CylinderGeometry(
      bodyRadiusTop, bodyRadiusBottom, bodyHeight, bodyRadialSegments);

  const headRadius = bodyRadiusTop * 0.8;
  const headLonSegments = 12;
  const headLatSegments = 5;
  const headGeometry = new THREE.SphereGeometry(
      headRadius, headLonSegments, headLatSegments);

  
  
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
  const headLonSegments = 8;
  const headLatSegments = 4;
  const headGeometry = new THREE.SphereGeometry(
      headRadius, headLonSegments, headLatSegments);
    
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

    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.name = name
    root.add(head);
    head.position.y = 1 + headRadius * 1.1;

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

  makePerson(-3, 0, 0, 150, 32, 'elbow_right_y', 'red',0.5 ,0.5);
  makePerson(3, 0, 0, 150, 32, 'hand_right_y', 'red',0.5 ,0.5);
  makePerson(7, 0, 0, 150, 32, 'handtip_right_y', 'red',0.5 ,0.5);
  makePerson(-5, 0, 0, 150, 32, 'shoulder_right_y', 'red',0.5 ,0.5);
  makePerson(5, 0, 0, 150, 32, 'thumb_right_y', 'red',0.5 ,0.5);
  makePerson(-1, 0, 0, 150, 32, 'wrist_right_y', 'red',0.5 ,0.5);

  makePerson(-3, 2, 0, 150, 32, 'elbow_right_x', 'red',0.5 ,0.5);
  makePerson(3, 2, 0, 150, 32, 'hand_right_x', 'red',0.5 ,0.5);
  makePerson(7, 2, 0, 150, 32, 'handtip_right_x', 'red',0.5 ,0.5);
  makePerson(-5, 2, 0, 150, 32, 'shoulder_right_x', 'red',0.5 ,0.5);
  makePerson(5, 2, 0, 150, 32, 'thumb_right_x', 'red',0.5 ,0.5);
  makePerson(-1, 2, 0, 150, 32, 'wrist_right_x', 'red',0.5 ,0.5);

  makePerson(-3, 4, 0, 150, 32, 'elbow_right_z', 'red',0.5 ,0.5);
  makePerson(3, 4, 0, 150, 32, 'hand_right_z', 'red',0.5 ,0.5);
  makePerson(7, 4, 0, 150, 32, 'handtip_right_z', 'red',0.5 ,0.5);
  makePerson(-5, 4, 0, 150, 32, 'shoulder_right_z', 'red',0.5 ,0.5);
  makePerson(5, 4, 0, 150, 32, 'thumb_right_z', 'red',0.5 ,0.5);
  makePerson(-1, 4, 0, 150, 32, 'wrist_right_z', 'red',0.5 ,0.5);

//   makePerson(6, 2, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(5, 2, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(4, 2, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(3, 2, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(2, 2, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(1, 2, 0, 150, 32, '', 'red',0.5 ,0.5);

//   makePerson(6, 3, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(5, 3, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(4, 3, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(3, 3, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(2, 3, 0, 150, 32, '', 'red',0.5 ,0.5);
//   makePerson(1, 3, 0, 150, 32, '', 'red',0.5 ,0.5);

// makePerson(-0, 150, 32, 'Green Machine', 'green');
// makePerson(-0, 150, 32, 'Green Machine', 'green');
// makePerson(+3, -3, 0, 150, 32, '+3, -3', 'red',1 ,1);
// makePerson(+2, -4, 0, 150, 32, '+2, -4', 'red',1 ,1);
// makePerson(+1, -5, 0, 150, 32, '+1, -5', 'red',1 ,1);
// makePerson(+0, -6, 0, 150, 32, '+0, -6', 'red',1 ,1);
// makePerson(+6, -0, 0, 150, 32, '+6, -0', 'red',1 ,1);
// makePerson(-6, +0, 0, 150, 32, '-6, +0', 'red',1 ,1);

  let r = 9
  let labelwidth = 300;
  let labelbigwidth = 3000;
  // makePerson(r*Math.cos(((0*Math.PI)/3)), r*Math.sin(((0*Math.PI)/3)), 0, 150, 150, '-2, -4', 'purple', "https://cdn.glitch.com/3fdb2c88-1e2d-4819-b254-73ba1b867eaf%2FNewSkin_flipped4_2021-27.svg?v=1614833495658", "1");
  // makePerson(r*Math.cos(((1*Math.PI)/3)), r*Math.sin(((1*Math.PI)/3)), 0, 150, 150, '-2, -4', 'purple', "https://cdn.glitch.com/3fdb2c88-1e2d-4819-b254-73ba1b867eaf%2FNewSkin_flipped4_2021-29.svg?v=1614833495659", "2");
  // makePerson(r*Math.cos(((2*Math.PI)/3)), r*Math.sin(((2*Math.PI)/3)), 0, 150, 150, '-2, -4', 'purple', "https://cdn.glitch.com/3fdb2c88-1e2d-4819-b254-73ba1b867eaf%2FNewSkin_flipped4_2021-30.svg?v=1614833495707", "3");
  // makePerson(r*Math.cos(((3*Math.PI)/3)), r*Math.sin(((3*Math.PI)/3)), 0, 150, 150, '-2, -4', 'purple', "https://cdn.glitch.com/3fdb2c88-1e2d-4819-b254-73ba1b867eaf%2FNewSkin_flipped4_2021-31.svg?v=1614833495740", "4");
  // makePerson(r*Math.cos(((4*Math.PI)/3)), r*Math.sin(((4*Math.PI)/3)), 0, 150, 150, '-2, -4', 'purple', "https://cdn.glitch.com/3fdb2c88-1e2d-4819-b254-73ba1b867eaf%2FNewSkin_flipped4_2021-32.svg?v=1614833495788", "5");
  // makePerson(r*Math.cos(((5*Math.PI)/3)), r*Math.sin(((5*Math.PI)/3)), 0, 150, 150, '-2, -4', 'purple', "https://cdn.glitch.com/3fdb2c88-1e2d-4819-b254-73ba1b867eaf%2FNewSkin_flipped4_2021-33.svg?v=1614833495838", "6");

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
  
  const composer = new THREE.EffectComposer( renderer );
  const outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
				composer.addPass( outlinePass );
  outlinePass.edgeThickness = 4;
  outlinePass.edgeStrength = 10;
  outlinePass.visibleEdgeColor.set('#f71b1b');
  outlinePass.hiddenEdgeColor.set('#ac6b20');

  var renderPass = new THREE.RenderPass(scene, camera);
    // renderPass.renderToScreen = true;
  composer.addPass(renderPass);

	var outputPass = new THREE.ShaderPass( THREE.CopyShader );
	outputPass.renderToScreen = true;
	composer.addPass( outputPass );
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
 
            // INTERSECTED.material.wireframe = false;
                if ( INTERSECTED ){
                  
        INTERSECTED.parent.children[0].material.color.setHex( INTERSECTED.currentHex );
        INTERSECTED.parent.children[0].material.emissive.r = INTERSECTED.parent.children[0].material.color.r
        INTERSECTED.parent.children[0].material.emissive.g = INTERSECTED.parent.children[0].material.color.g
        INTERSECTED.parent.children[0].material.emissive.b = INTERSECTED.parent.children[0].material.color.b
                // console.log(INTERSECTED)
                  // console.log(INTERSECTED.currentEmissive)
              // INTERSECTED.parent.children[0].material.emissive = INTERSECTED.currentHex 
              INTERSECTED.parent.children[0].material.transparency = true
              INTERSECTED.parent.children[0].material.opacity= 1;

                  
                // INTERSECTED.material.emissive.g = 0
                // INTERSECTED.material.emissive.r = 0
                  // INTERSECTED.material.emissive = false;
  }
        // store reference to closest object as current intersection object
        INTERSECTED = intersects[ 0 ].object.parent.children[0];
        outlinePass.selectedObjects = INTERSECTED
                // outlinePass.renderToScreen = true;
         composer.render()       
        // console.log(outlinePass)
        // console.log(composer)
                
                // console.log(INTERSECTED)
                // console.log("intersected")
        // store color of closest object (for later restoration)
        INTERSECTED.currentHex = INTERSECTED.parent.children[0].material.color.getHex();
                // console.log(INTERSECTED.parent.children[0].material.emissive)
        INTERSECTED.currentEmissive = INTERSECTED.parent.children[0].material.emissive
                // console.log()
                // console.log(INTERSECTED.currentEmissive.r, INTERSECTED.currentEmissive.g, INTERSECTED.currentEmissive.b)
                // console.log(INTERSECTED.currentEmissive)
        // set a new color for closest object
        INTERSECTED.parent.children[0].material.color.setHex( 0xffff00 );//YELLOW
        // INTERSECTED.material.emissive = true;
                INTERSECTED.parent.children[0].material.opacity= 1;
                INTERSECTED.material.emissive.g = 1
                INTERSECTED.material.emissive.r = 1
                INTERSECTED.material.emissive.b = 0

        INTERSECTED.parent.children[0].material.transparency = false;
                
        //           if (INTERSECTED.material.type != "SpriteMaterial"){
        // INTERSECTED.parent.children[0].material.emissive.r = INTERSECTED.currentEmissive.r
        // INTERSECTED.parent.children[0].material.emissive.g = INTERSECTED.currentEmissive.g
        // INTERSECTED.parent.children[0].material.emissive.b = INTERSECTED.currentEmissive.b
        //           }
                     document.getElementById("tooltip-title").innerHTML = INTERSECTED.name

    }
                                // console.log(event)
                // document.getElementById("tooltip").style.top = event.clientY+60 +"px"
                // document.getElementById("tooltip").style.left = event.clientX +"px"
        document.getElementById("tooltip").classList.add("opacity1")
        document.getElementById("tooltip").classList.remove("opacity0")
				const res = intersects.filter( function ( res ) {

					return res && res.object;

				} )[ 0 ];

				if ( res && res.object ) {
        } 			} else {
        
            if ( INTERSECTED ){
              // console.log(INTERSECTED)
              // console.log("intersected")
              
              
        INTERSECTED.parent.children[0].material.color.setHex( INTERSECTED.currentHex );
        INTERSECTED.parent.children[0].material.emissive.r = INTERSECTED.parent.children[0].material.color.r
        INTERSECTED.parent.children[0].material.emissive.g = INTERSECTED.parent.children[0].material.color.g
        INTERSECTED.parent.children[0].material.emissive.b = INTERSECTED.parent.children[0].material.color.b
        INTERSECTED.parent.children[0].material.transparency = true
              INTERSECTED.parent.children[0].material.opacity= 1;

                  
                // INTERSECTED.material.emissive.g = 0
                // INTERSECTED.material.emissive.r = 0
              // INTERSECTED.material.emissive = false;
              // document.getElementById("tooltip-title").innerHTML = null
    // remove previous intersection object reference
    //     by setting current intersection object to "nothing"
    INTERSECTED = null;
}
                        // console.log(event)
                // document.getElementById("tooltip").style.top = event.clientY+60 +"px"
        // document.getElementById("tooltip").style.left = event.clientX +"px"
        // document.getElementById("tooltip").style.display = "none:"
        document.getElementById("tooltip").classList.remove("opacity1")
        document.getElementById("tooltip").classList.add("opacity0")

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
  
  controls.target.x = window.controlsx
window.controlsx = 0
window.controlsy = 0
window.controlsz = 0
  controls.target.set(window.controlsx, window.controlsy, window.controlsz)
  controls.update()

    // controls.target.x = eval(590)
  // console.log(controls.target)
  controls.update()
  
sliderx.oninput = function() {
  // output.innerHTML = this.value;
  // console.log("sliderx")
  document.getElementById("sliderxamount").innerHTML = this.value
  window.controlsx = this.value
  controls.target.x = eval(this.value)
  // console.log(controls.target)
  controls.update()

}
  
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
  
  document.getElementById("myCheck").checked = true;
  document.getElementById("myCheck").onclick = function() {

  // If the checkbox is checked, display the output text
  if (document.getElementById("myCheck").checked == true){
    // console.log("checked")
    scene.children.forEach(element => showsprite(element))
  } else {
    // console.log("not checked")
    
    scene.children.forEach(element => hidesprite(element)

    
  )}
    
  }
 

 


  
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
      // output.innerHTML = this.value;
  // console.log("sliderx")

  // window.controlsx = this.value
    controls.target.x = eval(INTERSECTED.parent.position.x)
    controls.target.y = eval(INTERSECTED.parent.position.y)
    controls.target.z = eval(INTERSECTED.parent.position.z)
  // console.log(controls.target)
  controls.update()
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


 d3.csv("/arm_positions2.csv", function(data) {
    // for (var i = 0; i < data.length; i++) {
var elbow_right = scene.getObjectByName( "elbow_right_y" );
var hand_right = scene.getObjectByName( "hand_right_y" );
var handtip_right = scene.getObjectByName( "handtip_right_y" );
var shoulder_right = scene.getObjectByName( "shoulder_right_y" );
var thumb_right = scene.getObjectByName( "thumb_right_y" ); 
var wrist_right = scene.getObjectByName( "wrist_right_y" );
   
var elbow_right_z = scene.getObjectByName( "elbow_right_z" );
var hand_right_z = scene.getObjectByName( "hand_right_z" );
var handtip_right_z = scene.getObjectByName( "handtip_right_z" );
var shoulder_right_z = scene.getObjectByName( "shoulder_right_z" );
var thumb_right_z = scene.getObjectByName( "thumb_right_z" ); 
var wrist_right_z = scene.getObjectByName( "wrist_right_z" );
   
var elbow_right_x = scene.getObjectByName( "elbow_right_x" );
var hand_right_x = scene.getObjectByName( "hand_right_x" );
var handtip_right_x = scene.getObjectByName( "handtip_right_x" );
var shoulder_right_x = scene.getObjectByName( "shoulder_right_x" );
var thumb_right_x = scene.getObjectByName( "thumb_right_x" ); 
var wrist_right_x = scene.getObjectByName( "wrist_right_x" );
   
   
var i = 1;                  //  set your counter to 1
function moveSpheres() {    //  create a loop function
  setTimeout(function() {   //  call a 3s setTimeout when the loop is called
    console.log('hello');   //  your code here
    

      
      elbow_right.position.y = data[i].elbow_right/100
      hand_right.position.y = data[i].hand_right/100
      handtip_right.position.y = data[i].handtip_right/100
      shoulder_right.position.y = data[i].shoulder_right/100
      thumb_right.position.y = data[i].thumb_right/100
      wrist_right.position.y = data[i].wrist_right /100
    
          elbow_right_x.position.y = data[i].e_r_x/100
      hand_right_x.position.y = data[i].h_r_x/100
      handtip_right_x.position.y = data[i].ht_x/100
      shoulder_right_x.position.y = data[i].s_r_x/100
      thumb_right_x.position.y = data[i].t_r_x/100
      wrist_right_x.position.y = data[i].w_r_x /100
    
          elbow_right_z.position.y = (data[i].e_r_z/100)-14
      hand_right_z.position.y = (data[i].h_r_z/100)-14
      handtip_right_z.position.y = (data[i].ht_z/100)-14
      shoulder_right_z.position.y = (data[i].s_r_z/100)-14
      thumb_right_z.position.y = (data[i].t_r_z/100)-14
      wrist_right_z.position.y = (data[i].w_r_z /100)-14
    
    i++;                    //  increment the counter
    if (i < (data.length-1)) {           //  if the counter < 10, call the loop function
      moveSpheres();    
      //  ..  again which will trigger another 
    } else {
      i = 1
      moveSpheres();  
    }                       //  ..  setTimeout()
  }, 34.4827)
}

moveSpheres();     

});
  
