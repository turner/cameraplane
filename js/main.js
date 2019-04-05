import * as THREE from './threejs_es6/three.module.js';
import OrbitControls from './threejs_es6/orbit-controls-es6.js';
import { appleCrayonColorThreeJS, appleCrayonColorHexValue } from './color.js';
import { prettyMatrix4Print } from './math.js';

let scene;
let renderer;
let camera;
let orbitControl;

let showSTMaterial;

let threeJSContainer;

const scratchSpaceYOffset = 512;

const [ fov, near, far ] = [ 40, 1e-1, 7e2 ];

let main = async(container) => {

    const showSTConfig =
        {
            uniforms: {},
            vertexShader: document.getElementById( 'show_st_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_st_frag' ).textContent,
            side: THREE.DoubleSide
        };

    showSTMaterial = new THREE.ShaderMaterial( showSTConfig );

    const [ w, h ] = [ container.offsetWidth, container.offsetHeight ];
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, scratchSpaceYOffset + h);
    renderer.setViewport(0, scratchSpaceYOffset, w, h);
    renderer.setPixelRatio(window.devicePixelRatio);

    // insert rendering canvas in DOM
    container.appendChild(renderer.domElement);

    threeJSContainer = container;

    renderer.setClearColor(appleCrayonColorHexValue('snow'));

    camera = new THREE.PerspectiveCamera(fov, w / h, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);
    scene = new THREE.Scene();

    scene.background = appleCrayonColorThreeJS('magnesium');

    await setup(scene, camera, orbitControl);

    renderer.setViewport(0, scratchSpaceYOffset, w, h);

    renderLoop();

};

let target;
let planeMesh;
let setup = async (scene, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    target = new THREE.Vector3(targetX, targetY, targetZ);

    const dimen = 16;

    let [ locationX, locationY, locationZ ] = [ dimen, dimen, dimen ];
    // [ locationX, locationY, locationZ ] = [ 2*dimen, 0, 2*dimen ];
    // [ locationX, locationY, locationZ ] = [ 0, 0, 3*dimen ];
    // [ locationX, locationY, locationZ ] = [ 3*dimen, 0, 0 ];

    camera.position.set(locationX, locationY, locationZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();

    // const groundPlane = new THREE.GridHelper(4 * dimen, 4 * dimen, appleCrayonColorHexValue('steel'), appleCrayonColorHexValue('lead'));
    // groundPlane.position.set(targetX, targetY, targetZ);
    // scene.add( groundPlane );

    const texture = new THREE.TextureLoader().load( 'texture/uv.png' );
    const textureMaterial = new THREE.MeshBasicMaterial( { map: texture } );

    const boxMesh = new THREE.Mesh(new THREE.BoxBufferGeometry( dimen, dimen/4, dimen/2, 4, 4, 4 ), showSTMaterial);
    scene.add( boxMesh );

    // const sphereMesh = new THREE.Mesh(new THREE.SphereBufferGeometry( dimen/2, 32, 16 ), showSTMaterial);
    // scene.add( sphereMesh );

    planeMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry( 2, 2, 8, 8 ), textureMaterial);
    planeMesh.matrixAutoUpdate = false;
    scene.add( planeMesh );

    window.addEventListener( 'resize', onWindowResize, false );

};

let matrix4Factory = new THREE.Matrix4();
matrix4Factory.identity();

let vector3factory = new THREE.Vector3();
vector3factory.set(0, 0, 0);

let renderLoop = () => {

    requestAnimationFrame( renderLoop );

    orbitControl.update();
    camera.updateMatrixWorld();

    const distanceFromCamera = 0.9 * far;
    // const distanceFromCamera = camera.position.length();

    // A - Scale camera plane to fill viewing frustrum
    const dimension = distanceFromCamera * Math.tan( THREE.Math.degToRad( camera.fov/2 ) );
    const A = matrix4Factory.clone().makeScale(camera.aspect * dimension, dimension, 1);

    // B - Extract rotation by zeroing out translation. Invert resultant orthonormal matrix by transpose.
    const B = camera.matrixWorldInverse.clone().setPosition(vector3factory).transpose();

    // C - Translate rotated camera plane to camera origin
    const C = matrix4Factory.clone().makeTranslation(camera.position.x, camera.position.y, camera.position.z);

    // D - Position camera plane by translating it along camera look-at vector direction.
    const translation = vector3factory.clone().subVectors(target, camera.position).normalize().multiplyScalar(distanceFromCamera);
    const D = matrix4Factory.clone().makeTranslation(translation.x, translation.y, translation.z);

    // B * A
    // const BA = A.clone().premultiply(B);

    // C * B * A
    // const CBA = BA.clone().premultiply(C);

    // D * C * B * A
    // const DCBA = CBA.clone().premultiply(D);

    const cameraPlaneTransform = A.clone().premultiply(B).premultiply(C).premultiply(D).clone();
    // const cameraPlaneTransform = A.clone().premultiply(B).clone();

    // prettyMatrix4Print('A', A);
    // prettyMatrix4Print('B', B);
    // prettyMatrix4Print('C', C);
    // prettyMatrix4Print('D', D);

    // prettyMatrix4Print('BA', BA);
    // prettyMatrix4Print('CBA', CBA);
    // prettyMatrix4Print('DCBA', DCBA);

    // prettyMatrix4Print('camera - matrixWorld', camera.matrixWorld);
    // prettyMatrix4Print('matrixWorldInverse', camera.matrixWorldInverse);

    planeMesh.matrix.copy( cameraPlaneTransform );

    renderer.render(scene, camera);

};

let onWindowResize = () => {

    const [ w, h ] = [ threeJSContainer.offsetWidth, threeJSContainer.offsetHeight ];

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, scratchSpaceYOffset + h);
    renderer.setViewport(0, scratchSpaceYOffset, w, h);
};

export { main };
