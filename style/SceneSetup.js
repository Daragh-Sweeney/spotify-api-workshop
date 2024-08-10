//  Author: Daragh Sweeney
//  Project: Large Music Data Visualization

let scene, camera, renderer, controls;

export function initScene() {

    /* event listener to direct user to logout page */
    document.querySelector('.logout-button').addEventListener('click', function() {window.location.href = '/logout';});

    /* set up the  scene and add controls for the camera */
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.z = 1000; // Camera Position
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x051e2b);
    document.getElementById('three-container').appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.minDistance = 60;
    controls.maxDistance = 1000;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const audio = new Audio();

    /* Create the star field */
    createStarfield();

    /* Create the sun */
    const {glowMaterial,lightSphere} = createSun();

    /* Function to create an orbit circles around the sun */
    createOrbit(200);createOrbit(400);createOrbit(600);

    /* Function to create the nebula effect we see in the background of the scene */
    const cloudParticles = createNebula();


     const shootingStars = [];
     for (let i = 0; i < 50; i++) {
         const star = createShootingStar();
         scene.add(star);
         shootingStars.push(star);
     }

     animateCamera(camera);




    /* Return these values to the main javascript file  */
    return { scene, camera, renderer, controls, glowMaterial,lightSphere, raycaster, mouse, audio, cloudParticles, shootingStars };
}




/* set up a starfield around the environment */
function createStarfield() {

    // set the values for the stars
    const glowTexture = new THREE.TextureLoader().load('/public/images/glow.png');
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1000 * 3), 3));
    const glowSprites = [];
    const radius = 3000;
    const minRadius = 700;
    const yScale = 0.25;

    //we add 2000 stars to the scene
    for (let i = 0; i < 2000; i++) {
        const r = Math.random() * (radius - minRadius) + minRadius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) * yScale;
        const z = r * Math.cos(phi);
        starGeometry.attributes.position.setXYZ(i, x, y, z);
    }

    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Add glow to each star
    const positions = starGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const glowMaterial = new THREE.SpriteMaterial({map: glowTexture,color: 0xffffaa,transparent: true,blending: THREE.AdditiveBlending});
        const sprite = new THREE.Sprite(glowMaterial);
        sprite.position.set(positions[i], positions[i + 1], positions[i + 2]);
        sprite.scale.set(3, 3, 1); // Initial size, will be adjusted dynamically
        scene.add(sprite);
        glowSprites.push(sprite);
    }
}







/* create the sun */
function createSun() {

    const textureLoader = new THREE.TextureLoader();
    const sunTexture = textureLoader.load('/public/images/sun.jpg');
    const sunMaterial = new THREE.MeshPhongMaterial({map: sunTexture,emissive: new THREE.Color(0xffff00),emissiveIntensity: 0.1});
    const sphereGeometry = new THREE.SphereGeometry(23, 64, 64);
    const lightSphere = new THREE.Mesh(sphereGeometry, sunMaterial);
    lightSphere.position.set(0, 0, 0);
    scene.add(lightSphere);

    // Add glow effect
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { type: "f", value: 0.1 },
            p: { type: "f", value: 1.5 },
            glowColor: { type: "c", value: new THREE.Color(0xffaa00) },
            viewVector: { type: "v3", value: camera.position },
            time: { type: "f", value: 0 }
        },
        vertexShader: `
            uniform vec3 viewVector;
            uniform float time;
            varying float intensity;
            void main() {
                vec3 pos = position;
                pos.x += sin(pos.y * 10.0 + time) * 0.1;
                pos.y += cos(pos.x * 10.0 + time) * 0.1;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                vec3 actual_normal = vec3(modelMatrix * vec4(normal, 0.0));
                intensity = pow(dot(normalize(viewVector), actual_normal), 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying float intensity;
            void main()
            {
                vec3 glow = glowColor * intensity;
                gl_FragColor = vec4(glow, min(intensity, 0.6));
            }
        `,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    // Create a larger sphere for the glow effect
    const glowGeometry = new THREE.SphereGeometry(25, 64, 64);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    lightSphere.add(glowMesh);

    return {glowMaterial,lightSphere}

}





/* Update glow effect in the animation loop */
export function updateSunGlow(time,glowMaterial,lightSphere) {
    glowMaterial.uniforms.viewVector.value = new THREE.Vector3().subVectors(camera.position, lightSphere.position);
    glowMaterial.uniforms.time.value = time;

    // Add subtle pulsing to the sun
    const pulseFactor = Math.sin(time * 2) * 0.01 + 2;
    lightSphere.scale.set(pulseFactor, pulseFactor, pulseFactor);

    // Rotate the sun slowly
    lightSphere.rotation.y += 0.001;
}



/* Create a ring around the sun */
function createOrbit(radius) {
    const ringGeometry = new THREE.RingGeometry(radius - 0.25, radius + 0.25, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
}



/* Create a cloud nebula effect in the background */
function createNebula(){


    let cloudParticles = [];
    const loader = new THREE.TextureLoader();
    loader.load("/public/images/smoke.png", function(texture) {
        const cloudGeo = new THREE.SphereGeometry(2000, 32, 32); // Large sphere to encompass the scene
        const cloudMaterial = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            side: THREE.BackSide // Render the inside of the sphere
        });

        // Create multiple layers of nebula for more depth
        for (let i = 0; i < 10; i++) {
            let nebulaCloud = new THREE.Mesh(cloudGeo, cloudMaterial.clone());
            nebulaCloud.rotation.x = Math.random() * 2 * Math.PI;
            nebulaCloud.rotation.y = Math.random() * 2 * Math.PI;
            nebulaCloud.rotation.z = Math.random() * 2 * Math.PI;
            nebulaCloud.material.opacity = 0.50; // Increased opacity
            nebulaCloud.scale.setScalar(0.90 + i * 0.1); // Slightly different sizes
            cloudParticles.push(nebulaCloud);
            scene.add(nebulaCloud);
        }
    });

    // Additional lighting for nebula effect
    let ambientLight = new THREE.AmbientLight(0x555555, 0.6);
    scene.add(ambientLight);

    let hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);

    let softLight = new THREE.DirectionalLight(0xffffff, 0.2);
    softLight.position.set(1, 1, 1).normalize();
    scene.add(softLight);

    let planetLight = new THREE.DirectionalLight(0xffffff, 0.6);
    planetLight.position.set(200, 200, 200);
    scene.add(planetLight);

    let orangeLight = new THREE.PointLight(0xcc6600, 100, 2000, 1.7);
    orangeLight.position.set(1000, 1500, 500);
    scene.add(orangeLight);

    let redLight = new THREE.PointLight(0xd8547e, 100, 2000, 1.7);
    redLight.position.set(500, 1500, 500);
    scene.add(redLight);

    let blueLight = new THREE.PointLight(0x3677ac, 100, 2000, 1.7);
    blueLight.position.set(1500, 1500, 1000);
    scene.add(blueLight);

    return cloudParticles;
}


function createShootingStar() {
    const particleCount = 20;
    const particles = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        particles[i * 3] = i * 0.1;
        particles[i * 3 + 1] = 0;
        particles[i * 3 + 2] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    const material = new THREE.PointsMaterial({color: 0xFFFFFF,size: 10,transparent: true,blending: THREE.AdditiveBlending});
    const star = new THREE.Points(geometry, material);

    // Set initial position and Set velocity
    star.position.set(Math.random() * 8000 - 4000,Math.random() * 8000 - 4000,Math.random() * 8000 - 4000);
    star.velocity = new THREE.Vector3(-5 - Math.random() * 5,-5 - Math.random() * 5,-5 - Math.random() * 5);

    return star;
}

export function updateShootingStars(shootingStars) {
    shootingStars.forEach(star => {
        star.position.add(star.velocity);

        // Rotate the star to face the direction of movement
        star.lookAt(star.position.clone().add(star.velocity));

        // If the star is out of the scene, reset its position
        if (star.position.length() > 5000) {
            star.position.set(Math.random() * 8000 - 4000,Math.random() * 8000 - 4000,Math.random() * 8000 - 4000);
            star.velocity.set(-3 - Math.random() * 3,-3 - Math.random() * 3,-3 - Math.random() * 3);
        }
    });
}

// Animate Camera to Zoom In and Fade Out Welcome Message
function animateCamera(camera) {
    const targetZ = 200;
    const targetY = 100;
    const duration = 3000; // 3 seconds
    const startZ = camera.position.z;
    const startY = camera.position.y;
    const startTime = performance.now();


    function zoom(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        camera.position.z = startZ + (targetZ - startZ) * progress;
        camera.position.y = startY + (targetY - startY) * progress;

        if (progress < 1) {requestAnimationFrame(zoom);}
    }
    requestAnimationFrame(zoom);
}

