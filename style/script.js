//  Author: Daragh Sweeney
//  Project: Large Music Data Visualization

/* event listener to direct user to logout page */
document.querySelector('.logout-button').addEventListener('click', function() {window.location.href = '/logout';});

/* Set up Three scene  in the three container */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x051e2b);// set the background colour
document.getElementById('three-container').appendChild(renderer.domElement);



// Raycaster and Mouse Setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const audio = new Audio();
const currentSongElement = document.getElementById('current-song');
const playPauseButton = document.getElementById('play-pause-btn');
const waveformElement = document.getElementById('waveform');

/* Orbit Control is used to orbit camera around the sun  */
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.minDistance = 25;
controls.maxDistance = 3000;





/* After setting up the scene I set up the starfield around the environment */
const glowTexture = new THREE.TextureLoader().load('/public/images/glow.png');
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1000 * 3), 3));
const glowSprites = []; // Array to store glow sprites

const radius = 3000; // Radius of the sphere
const minRadius = 300; // Minimum distance from the center
const yScale = 0.25; // Scale factor for squishing effect

for (let i = 0; i < 2000; i++) {
    const r = Math.random() * (radius - minRadius) + minRadius; // Random radius between minRadius and radius
    const theta = Math.random() * Math.PI * 2; // Random angle around the y-axis
    const phi = Math.acos(2 * Math.random() - 1); // Random angle from the y-axis

    // Convert spherical coordinates to Cartesian coordinates
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta) * yScale; // Apply y-scale factor for squished effect
    const z = r * Math.cos(phi);

    starGeometry.attributes.position.setXYZ(i, x, y, z);
}

const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// Add glow to each star
const positions = starGeometry.attributes.position.array;
for (let i = 0; i < positions.length; i += 3) {
    const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffaa, // Optional: Adjust the glow color if needed
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const sprite = new THREE.Sprite(glowMaterial);
    sprite.position.set(positions[i], positions[i + 1], positions[i + 2]);
    sprite.scale.set(20, 20, 1); // Initial size, will be adjusted dynamically
    scene.add(sprite);
    glowSprites.push(sprite);
}


/* Set up the sun and the lighting */
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);
const sunRadius = 25;


// Load sun texture
const textureLoader = new THREE.TextureLoader();
const sunTexture = textureLoader.load('/public/images/sun.jpg');
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sphereGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
const lightSphere = new THREE.Mesh(sphereGeometry, sunMaterial);
lightSphere.position.set(0, 0, 0);
scene.add(lightSphere);

// Add glow effect
const spriteMaterial = new THREE.SpriteMaterial({
    map: textureLoader.load('/public/images/glow.png'),
    color: 0xffff00,
    transparent: true,
    blending: THREE.AdditiveBlending
});

const sprite = new THREE.Sprite(spriteMaterial);
sprite.scale.set(70, 70, 0.5); // Adjust size as needed
lightSphere.add(sprite);

// Add point light to simulate the sun's light
const sunLight = new THREE.PointLight(0xffffff, 1.5, 500);
sunLight.position.copy(lightSphere.position);
scene.add(sunLight);

/* Function to create an orbit circle */
function createOrbit(radius) {
    const ringGeometry = new THREE.RingGeometry(radius - 0.25, radius + 0.25, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Rotate to make it horizontal
    scene.add(ring);
}

/* Create 3 orbit circles */
createOrbit(100);
createOrbit(200);
createOrbit(300);

/* Now we set up the Particle System for Tracks */
const particles = [];
const lines = [];
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });
let playingParticle = null;

/* Function to Create Text Texture */
function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '48px Arial';
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth;
    canvas.height = 48; // Height based on font size
    context.font = '48px Arial';
    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.fillText(text, 0, 0);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
}

/* This function is used to get the  */
async function addTrackParticles(tracks) {
    const genres = ["rock", "pop", "classical", "hiphop", "country", "latin", "edm_dance", "jazz"];
    const genreColors = {
        'rock': 0x0000ff,// Blue
        'pop': 0xffff00,// Yellow
        'classical': 0xffa500,// Orange
        'hiphop': 0xff00ff,// Magenta
        'country': 0x00ff00,// Green
        'latin': 0x8a2be2,// Blue Violet
        'edm_dance': 0x808080,// Gray
        'jazz': 0xffc0cb// Pink
    };

    async function fetchGenre(mp3path) {
        const response = await fetch(`/getGenre?previewUrl=${encodeURIComponent(mp3path)}`);
        const data = await response.json();
        return data;
    }



    for (const t of tracks) {
        if (!t.track.preview_url) continue;

        const info = await fetchGenre(t.track.preview_url);
        const genre = info.genre;
        const tempo = info.tempo;
        const loudness = info.loudness;

        const noise2D = createNoise2D();

        // Map loudness to distance range
        const minDistance = 100; // Minimum distance from the sun
        const maxDistance = 600; // Maximum distance from the sun
        const distance = minDistance + (maxDistance - minDistance) * loudness;

        const theta = Math.random() * Math.PI * 2; // Angle around the vertical axis
        const phi = Math.acos(Math.random() * 2 - 1); // Angle from the vertical axis

        const x = distance * Math.sin(phi) * Math.cos(theta);
        const z = distance * Math.cos(phi);

        const radius = 5; // Base radius for the particle
        const geometry = new THREE.SphereGeometry(radius, 100, 100); // Increase resolution for better terrain detail

        // Determine genre color and blend with mountain/sea tones
        const color = new THREE.Color(genreColors[genre]);


        // Displace vertices to create terrain
        const positionAttribute = geometry.getAttribute('position');
        for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positionAttribute, i);

            // Use tempo to influence terrain roughness
            const noiseScale = 0.5 + (tempo / 400); // Reduced scale for smaller features
            const noiseValue = noise2D(vertex.x * noiseScale, vertex.z * noiseScale);

            // Use loudness to influence terrain height
            const displacementScale = 0.05 + (loudness * 0.05);
            const displacement = noiseValue * displacementScale;

            vertex.normalize().multiplyScalar(radius * (1 + displacement));
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        geometry.computeVertexNormals(); // Recompute normals for proper lighting

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 1.5,
            metalness: 0.1,
            flatShading: false // This will give a more rugged appearance
        });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(x, 0, z); // Set y to 0
        particle.userData = { preview_url: t.track.preview_url, name: t.track.name };

        scene.add(particle);
        particles.push(particle);

        // Create text label
        const textTexture = createTextTexture(t.track.name);
        const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
        const textSprite = new THREE.Sprite(textMaterial);
        textSprite.scale.set(10, 5, 1);
        textSprite.position.set(0, radius + 2, 0);
        particle.add(textSprite);
    }
}

addTrackParticles(tracks); // Call the function with your tracks data

camera.position.z = 5000; // Camera Position

// Function to Find Closest Particles
function findClosestParticles(particle, count) {
    return particles
        .filter(p => p !== particle)
        .sort((a, b) => particle.position.distanceTo(a.position) - particle.position.distanceTo(b.position))
        .slice(0, count);
}

// Function to Draw Lines Between Particles
function drawLines(particle, closestParticles) {
    lines.forEach(line => scene.remove(line));
    lines.length = 0;

    function createLine(p1, p2) {
        const points = [p1.position.clone(), p2.position.clone()];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        lines.push(line);
    }

    closestParticles.forEach(closeParticle => {
        createLine(particle, closeParticle);
        const secondClosestParticles = findClosestParticles(closeParticle, 1);
        secondClosestParticles.forEach(secondCloseParticle => {createLine(closeParticle, secondCloseParticle);});
    });
}

/* The animation loop  is used */
function animate() {
    requestAnimationFrame(animate);
    camera.position.x = camera.position.x * Math.cos(0.0001) - camera.position.z * Math.sin(0.0001);
    camera.position.z = camera.position.z * Math.cos(0.0001) + camera.position.x * Math.sin(0.0001);
    //camera.lookAt(scene.position);
    controls.update();
    renderer.render(scene, camera);

    // Adjust the scale of the glow sprites based on the distance to the camera
        glowSprites.forEach(sprite => {
            const distanceToOrigin = camera.position.length();
            const scale = Math.max(3, 3); // Adjust the scaling factor as needed
            //const scale = Math.max(2, distanceToOrigin / 40); // Adjust the scaling factor as needed
            sprite.scale.set(scale, scale, 1);
        });
}

// Animate Camera to Zoom In and Fade Out Welcome Message
function animateCamera() {
    const targetZ = 200;
    const targetY = 100;
    const duration = 3000; // 3 seconds
    const startZ = camera.position.z;
    const startY = camera.position.y;
    const startTime = performance.now();
    const welcomeMessage = document.getElementById('welcome-message');

    function zoom(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        camera.position.z = startZ + (targetZ - startZ) * progress;
        camera.position.y = startY + (targetY - startY) * progress;
        welcomeMessage.style.opacity = 1 - progress;
        if (progress < 1) {requestAnimationFrame(zoom);}
        else {welcomeMessage.style.display = 'none';}
    }
    requestAnimationFrame(zoom);
}

// Call Animation Functions
animate();
animateCamera();

// Wavesurfer Setup
const wavesurfer = WaveSurfer.create({container: '#waveform',waveColor: 'white',progressColor: 'yellow',barWidth: 3,height: 60,responsive: true,});
wavesurfer.on('ready', function () {
    waveformElement.addEventListener('click', function (e) {
        const progress = (e.clientX - waveformElement.getBoundingClientRect().left) / waveformElement.clientWidth;
        wavesurfer.seekTo(progress);
    });
    wavesurfer.play();
});

// Mouse Click Event Listener
function onMouseClick(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(particles);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const previewUrl = intersected.userData.preview_url;

        if (audio.src !== previewUrl) {
            audio.src = previewUrl;
            currentSongElement.textContent = intersected.userData.name || 'Unknown song';
            playPauseButton.textContent = 'Pause';
            wavesurfer.load(previewUrl);
        } else {wavesurfer.playPause();}

        playingParticle = intersected;
        const closestParticles = findClosestParticles(playingParticle, 5);
        drawLines(playingParticle, closestParticles);

        // Animate camera to the selected particle
        gsap.to(camera.position, {
            duration: 1.5,
            x: intersected.position.x >= 0 ? intersected.position.x + 50 : intersected.position.x - 50,
            y: intersected.position.y + 75,
            z: intersected.position.z >= 0 ? intersected.position.z + 50 : intersected.position.z - 50,
            onUpdate: function() {
                controls.target.set(intersected.position.x, intersected.position.y, intersected.position.z);
                controls.update(); // Update controls to reflect the new target position
            }
        });

        gsap.to(controls.target, {
            duration: 1.5,
            x: intersected.position.x,
            y: intersected.position.y,
            z: intersected.position.z,
            onUpdate: function() {controls.update();}
        });
    }
}

/* calls on mouse click function */
window.addEventListener('click', onMouseClick, false);
/* Resize Window event listener */
window.addEventListener('resize', () => {camera.aspect = window.innerWidth / window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth, window.innerHeight);});
/* The Play Pause button event listener */
playPauseButton.addEventListener('click', () => {
    if (wavesurfer.isPlaying()) {wavesurfer.pause();playPauseButton.textContent = 'Play';
    } else {wavesurfer.play();playPauseButton.textContent = 'Pause';}
});