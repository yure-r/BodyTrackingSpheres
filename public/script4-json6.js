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








 d3.json("/output.json", function(data) { 
   
 console.log(data.frames)
   
var i = 1;                  //  set your counter to 1
function moveSpheres() {    //  create a loop function
  setTimeout(function() {   //  call a setTimeout when the loop is called
    console.log('hello');   //  your code here


      
  if (data.frames[i].bodies.length > 0){
    
  PELVIS.position.y = ((data.frames[i].bodies[0].joint_positions[0][1])/-100)
	SPINE_NAVAL.position.y = ((data.frames[i].bodies[0].joint_positions[1][1])/-100)
  SPINE_CHEST.position.y = ((data.frames[i].bodies[0].joint_positions[2][1])/-100)
	NECK.position.y = ((data.frames[i].bodies[0].joint_positions[3][1])/-100)
	CLAVICLE_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[4][1])/-100)
	SHOULDER_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[5][1])/-100)
  ELBOW_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[6][1])/-100)
	WRIST_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[7][1])/-100)
	HAND_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[8][1])/-100)
	HANDTIP_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[9][1])/-100)
	THUMB_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[10][1])/-100)
	CLAVICLE_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[11][1])/-100)
	SHOULDER_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[12][1])/-100)
	ELBOW_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[13][1])/-100)
	WRIST_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[14][1])/-100)
	HAND_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[15][1])/-100)
	HANDTIP_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[16][1])/-100)
	THUMB_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[17][1])/-100)
  HIP_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[18][1])/-100)
	KNEE_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[19][1])/-100)
	ANKLE_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[20][1])/-100)
	FOOT_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[21][1])/-100)
	HIP_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[22][1])/-100)
	KNEE_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[23][1])/-100)
	ANKLE_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[24][1])/-100)
	FOOT_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[25][1])/-100)
	HEAD.position.y = ((data.frames[i].bodies[0].joint_positions[26][1])/-100)
	NOSE.position.y = ((data.frames[i].bodies[0].joint_positions[27][1])/-100)
	EYE_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[28][1])/-100)
	EAR_LEFT.position.y = ((data.frames[i].bodies[0].joint_positions[29][1])/-100)
	EYE_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[30][1])/-100)
	EAR_RIGHT.position.y = ((data.frames[i].bodies[0].joint_positions[31][1])/-100)
    
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
    

// FOOT_LEFT_PAD_EDGE_TOP_6.position.y = (NECK_EAR_CLAVICLE_LEFT_PAD.position.y + FOOT_LEFT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y )/3 // OTHER AVG
    

// FOOT_RIGHT_PAD_EDGE_TOP_6.position.y = (NECK_EAR_CLAVICLE_RIGHT_PAD.position.y + FOOT_RIGHT_PAD_EDGE_TOP_5.position.y + SPINE_CHEST.position.y )/3 // OTHER AVG
    
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
    
  }
    

    
    i++;                    //  increment the counter
    if (i < (data.frames.length-1)) {           //  if the counter < 10, call the loop function
      // console.log("if")
      moveSpheres();    
      //  ..  again which will trigger another 
    } else {
      i = 1
      // console.log("else")
      moveSpheres();  
    }                       //  ..  setTimeout()
  }, 34.4827) // this is the time between each frame
}

moveSpheres();     

});
  
