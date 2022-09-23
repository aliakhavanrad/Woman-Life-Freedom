import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GPUComputationRenderer } from './GPUComputationRenderer.js';

import computePositionFragmentShader from './shaders/computePosition/fragment.glsl'

import pixelsParticleVertexShader from './shaders/pixelsParticle/vertex.glsl'
import pixelsParticleFragmentShader from './shaders/pixelsParticle/fragment.glsl'



/**
 * Constants
 */

let shaderMaterial;

const imageWidth = 481;
 const imageHeight = 271;

 var imageData = null;
 let particlesCount = imageWidth * imageHeight;
 let particleSystem ;

let gpuCompute = null;
let positionVariable = null;
let positionUniforms = null;

const COMPUTE_POSITION_TEXTURE = 'uComputePositionTexture';
const TARGET_POSITION_UNIFORM = 'uTargetPosition'
const MOUSE_POSITION_UNIFORM = 'uMousePosition'

let targetPositionsAttribute = new Float32Array(particlesCount * 3);
let firstPositionsAttribute = new Float32Array(particlesCount * 3);
let vertexColorAttribute = new Float32Array(particlesCount * 3);
let noiseAttribute = new Float32Array(particlesCount);
let reference = new Float32Array(particlesCount * 2)

let raycasterPlane;

let shaderUniforms = {
  uTime: {
    value: 0.0
  },
  uComputePositionTexture: {
    value: null
  }
};

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const mouse = {
  x: 10000,
  y: 0
}


window.addEventListener('mousemove', (event) => {
  const newPositionX = event.clientX / sizes.width * 2 - 1
  const newPositionY = -(event.clientY / sizes.height) * 2 + 1

    mouse.x = newPositionX
    mouse.y = newPositionY

})

const raycaster = new THREE.Raycaster();

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(window.devicePixelRatio)
    
})



/**
 * Loaders
 */

 const textureLoader = new THREE.TextureLoader();    



/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 10000)
camera.position.x = -100
camera.position.y = 150
camera.position.z = 400
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minPolarAngle = 3 * Math.PI / 8; // radians
controls.maxPolarAngle = 5 * Math.PI / 8; // radians

controls.minAzimuthAngle = - Math.PI / 16
controls.maxAzimuthAngle = Math.PI / 16
controls.minDistance = 50
controls.maxDistance = 450

/**
 * Axis Helper
 */
// const axisHelper = new THREE.AxesHelper(100);
// scene.add(axisHelper)

/**
 * Light
 */


 const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

 scene.add(directionalLight);



/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(window.devicePixelRatio)

/**
 * GPU compute renderer
 */
 function initComputeRenderer() {

    gpuCompute = new GPUComputationRenderer( imageWidth, imageHeight, renderer );
   

    if ( renderer.capabilities.isWebGL2 === false ) {

        gpuCompute.setDataType( THREE.HalfFloatType );

    }

    const computePositionTexture = gpuCompute.createTexture();    
    fillPositionTexture( computePositionTexture, firstPositionsAttribute );

    positionVariable = gpuCompute.addVariable( COMPUTE_POSITION_TEXTURE, computePositionFragmentShader, computePositionTexture );
    gpuCompute.setVariableDependencies( positionVariable, [ positionVariable ] );






    const targetPositionTexture = gpuCompute.createTexture();
    // fillPositionTexture(targetPositionTexture, targetPositionsAttribute);
    fillPositionTexture(targetPositionTexture, firstPositionsAttribute);

    positionUniforms = positionVariable.material.uniforms;
    positionUniforms[TARGET_POSITION_UNIFORM] = { value: targetPositionTexture};
    positionUniforms[MOUSE_POSITION_UNIFORM] = { value: new THREE.Vector2(10000, 0)};
    
    positionVariable.wrapS = THREE.RepeatWrapping;
    positionVariable.wrapT = THREE.RepeatWrapping;

    const error = gpuCompute.init();

    if ( error !== null ) {

        console.error( error );

    }

}

function fillPositionTexture(texture, array){

    const theArray = texture.image.data;
    
    for ( let k = 0, kl = theArray.length; k < kl; k += 4 ) {

        theArray[ k + 0 ]= array[(k / 4) * 3];
        theArray[ k + 1 ]= array[(k / 4) * 3 + 1];
        theArray[ k + 2 ]= array[(k / 4) * 3 + 2];
        theArray[ k + 3 ]= 1;
    }

    //console.log(texture.image.data);

}


function createPixelData() {
    var image = document.createElement("img");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    
    image.crossOrigin = "Anonymous";
    image.onload = function() {
      image.width = canvas.width = imageWidth;
      image.height = canvas.height = imageHeight;
      
      context.fillStyle = context.createPattern(image, 'no-repeat');
      context.fillRect(0, 0, imageWidth, imageHeight);
      //context.drawImage(image, 0, 0, imageWidth, imageHeight);
      
      imageData = context.getImageData(0, 0, imageWidth, imageHeight).data;
  
  
      createGround();
      createPaticles();
      initComputeRenderer();
      tick();
    };
    
    image.src = "textures/mahsa.jpg";
  }

function createPaticles() {
   
    var c = 0;
  
    var geometry;
    var x, y;
  
    geometry = new THREE.BufferGeometry();
  
    x = imageWidth * -0.5;
    y = imageHeight * 0.5;
  

   
    for (var i = 0; i < imageHeight; i++) {
        for (var j = 0; j < imageWidth; j++) {
     
            vertexColorAttribute[(c / 4) * 3] = imageData[c] / 255;
            vertexColorAttribute[(c / 4) * 3 + 1] = imageData[c + 1] / 255;
            vertexColorAttribute[(c / 4) * 3 + 2] = imageData[c + 2] / 255;
        
            targetPositionsAttribute[(c / 4) * 3 ] = x;
            targetPositionsAttribute[(c / 4) * 3 + 1] = y;
            targetPositionsAttribute[(c / 4) * 3 + 2] = Math.random() * 2 - 1;

            firstPositionsAttribute[(c / 4) * 3 ] = Math.random() * 4000 - 2000;
            firstPositionsAttribute[(c / 4) * 3 + 1] = Math.random() * 100 - 200;
            firstPositionsAttribute[(c / 4) * 3 + 2] = Math.random() * 4000 - 2000;

      
            noiseAttribute[(c / 4)] = Math.random() - 0.5;

            reference[(c / 4) * 2 ] =  j / imageWidth;
            reference[(c / 4) * 2  + 1] =i / imageHeight;

            c += 4;
            x++;
        }
    
        x = imageWidth * -0.5;
        y--;
      }


      geometry.setAttribute('position', new THREE.BufferAttribute(firstPositionsAttribute, 3));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(vertexColorAttribute, 3));
      geometry.setAttribute('aNoise', new THREE.BufferAttribute(noiseAttribute, 1));
      geometry.setAttribute('reference', new THREE.BufferAttribute(reference, 2))


  
   shaderMaterial = new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      vertexShader: pixelsParticleVertexShader,  
      fragmentShader: pixelsParticleFragmentShader, 
      vertexColors: true,
    })
  
    particleSystem = new THREE.Points(geometry, shaderMaterial);
  
    scene.add(particleSystem);
  }
  
  function createGround(){
    
    const geometry = new THREE.PlaneGeometry(10000, 5000);

    const texture = textureLoader.load('textures/mahsa_.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.repeat = new THREE.Vector2(10, 10);

    const material = new THREE.ShaderMaterial(
      { 
        transparent: true,
        uniforms:
        {
            uAlpha: { value: 0.2 } ,
            uTexture: { value: texture}
        },
        vertexShader:`
        varying vec2 vUv;

        void main()
        {
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);;
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectionPosition = projectionMatrix * viewPosition;

            gl_Position = projectionPosition;
            vUv = uv;
        }
        `,
        fragmentShader:`
        uniform float uAlpha;
        uniform sampler2D uTexture;

        varying vec2 vUv;

        void main()
        {
            vec4 textureColor = texture2D(uTexture, vUv);

            gl_FragColor = vec4(textureColor.rgb, uAlpha);
        }`

        
      });

    
    const groundPlane = new THREE.Mesh(geometry, material);
    groundPlane.rotateX(- Math.PI / 2)
    groundPlane.translateY(2200)
    groundPlane.translateZ(-500)
    scene.add(groundPlane)
  }


  function createTextGeometry(text){
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width= sizes.width
    textureCanvas.height= sizes.height
    const ctx = textureCanvas.getContext('2d');

    const fontSize =  sizes.width < 600 ? 30 : (sizes.width < 800 ? 50 : 80); 


    ctx.font = `${fontSize}px tahoma`;
    
    ctx.fillStyle = "black";
    
    ctx.clearRect(0, 0, sizes.width, sizes.height);

    ctx.fillStyle = 'rgb(255, 10, 10)';
    ctx.textAlign = "center";
    ctx.fillText(text, textureCanvas.width / 2, textureCanvas.height / 2);

    const myImageData = ctx.getImageData(0, 0, textureCanvas.width, textureCanvas.height);

    const textPositionArray = new Float32Array(particlesCount * 3);

    const data = myImageData.data;

    const nonZeroValues = [];

    for (let i = 0; i < data.length; i += 4) {
   
      if (data[i] === 0 &&
        data[i + 1] === 0 &&
        data[i + 2] === 0 &&
        data[i + 3] === 0) {
        continue
      }

      const x = (i / 4) % sizes.width - sizes.width / 2
      const y = sizes.height / 2 - Math.floor((i / 4) / sizes.width) 

      nonZeroValues.push(x);
      nonZeroValues.push(y);
      nonZeroValues.push(Math.random() * 10);
    }

    const nonZeroValuesLength = nonZeroValues.length;

    for (let i = 0; i < textPositionArray.length + nonZeroValuesLength; i += nonZeroValuesLength)
    {
      for (let j = 0; j < nonZeroValuesLength; j += 3)
      {
          let index = i + j;
          textPositionArray[index] = nonZeroValues[j]
          textPositionArray[index + 1] = nonZeroValues[j + 1]
          textPositionArray[index + 2] = nonZeroValues[j + 2]
      }
    }

    const textPositionTexture = gpuCompute.createTexture();
    fillPositionTexture(textPositionTexture, textPositionArray);
      

    positionUniforms[TARGET_POSITION_UNIFORM] = { value: textPositionTexture};

    
  }

function addEventListener(){

  window.removeEventListener('load', addEventListener);

  setTimeout(() => {    
      createTextGeometry("Mahsa Amini"); 
  }, 0);

  
  setTimeout(() => {
    const textPositionTexture = gpuCompute.createTexture();
    fillPositionTexture(textPositionTexture, targetPositionsAttribute);
      

    positionUniforms[TARGET_POSITION_UNIFORM] = { value: textPositionTexture};
  }, 10000);

  setTimeout(() => {
    createTextGeometry("Woman, Life, Freedom")  
  }, 20000);

}

  
window.addEventListener('load', addEventListener)

setInterval(() => {
  addEventListener();
}, 30000);




/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime

 
    shaderUniforms.uTime.value = elapsedTime;

    controls.update()

     /**
     * update next position texture
     */
    if(gpuCompute){

      raycaster.setFromCamera(mouse, camera);

      gpuCompute.compute();

        let texture = gpuCompute.getCurrentRenderTarget( positionVariable ).texture;
    
        shaderMaterial.uniforms[COMPUTE_POSITION_TEXTURE].value = texture;

    }
    

    // Render
    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}


createPixelData();