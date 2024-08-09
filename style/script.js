//  Author: Daragh Sweeney
//  Project: Large Music Data Visualization
//  script.js: this is the main javascript file

// Get the objects from HTML page
const displayBox = document.getElementById('display-content');
const currentSongElement = document.getElementById('current-song');
const playPauseButton = document.getElementById('play-pause-btn');
const waveformElement = document.getElementById('waveform');
const welcomeMessage = document.getElementById('welcome-message');
let playingParticle = null; // this tracks the current playing song



// SceneSetup.js is used to create the Three JS environment the starfield, the sun and the nebula background effect
import { initScene, updateSunGlow, updateShootingStars } from './SceneSetup.js';
const { scene, camera, renderer, controls, glowMaterial,lightSphere, raycaster, mouse, audio, cloudParticles, shootingStars} = initScene();



// PlanetSetup.js is used to create a planet object for each of the tracks
import { createPlanets, particles, lines, animateLines, findClosestParticles, drawLines,updateParticleSize,updateDisplayBox } from './PlanetSetup.js';
createPlanets(tracks,scene,welcomeMessage);
animateLines();



/* The animation loop is used */
function animate(time) {
    requestAnimationFrame(animate);
    camera.position.x = camera.position.x * Math.cos(0.0001) - camera.position.z * Math.sin(0.0001);
    camera.position.z = camera.position.z * Math.cos(0.0001) + camera.position.x * Math.sin(0.0001);
    controls.update();
    updateSunGlow(time * 0.001,glowMaterial,lightSphere);

    // Animate nebula
    cloudParticles.forEach((p, index) => {p.rotation.x += 0.0001 + index * 0.00005;p.rotation.y += 0.0001 + index * 0.00005;p.rotation.z += 0.0001 + index * 0.00005;});
    updateShootingStars(shootingStars);
    renderer.render(scene, camera);
}



// Call Animation Functions
animate(0);





// Wavesurfer Setup
const wavesurfer = WaveSurfer.create({container: '#waveform',waveColor: 'white',progressColor: 'yellow',barWidth: 3,height: 60,responsive: true,});
wavesurfer.on('ready', function () {
    waveformElement.addEventListener('click', function (e) {
        const progress = (e.clientX - waveformElement.getBoundingClientRect().left) / waveformElement.clientWidth;
        wavesurfer.seekTo(progress);
    });
    wavesurfer.play();
});


function onMouseClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const objectsToCheck = particles.concat(particles.map(p => p.userData.textSprite));
    const intersects = raycaster.intersectObjects(objectsToCheck);

    if (intersects.length > 0) {
        let selectedObject = intersects[0].object;
        if (selectedObject instanceof THREE.Sprite) {
            selectedObject = selectedObject.parent;
        }
        selectPlanet(selectedObject);
    }
}

export function selectPlanet(selectedObject) {
    const previewUrl = selectedObject.userData.preview_url;

    if (audio.src !== previewUrl) {
        audio.src = previewUrl;
        currentSongElement.textContent = selectedObject.userData.name || 'Unknown song';
        playPauseButton.textContent = 'Pause';
        wavesurfer.load(previewUrl);

        if (playingParticle) {updateParticleSize(playingParticle, -60);}
        updateParticleSize(selectedObject, selectedObject.userData.loudness);

    }

    else {wavesurfer.playPause();}

    playingParticle = selectedObject;
    const closestParticles = findClosestParticles(playingParticle, 5);
    drawLines(playingParticle, closestParticles,scene);
    updateDisplayBox(selectedObject, closestParticles,displayBox);

    // Animate camera to the selected particle
    gsap.to(camera.position, {
        duration: 1.5,
        x: selectedObject.position.x >= 0 ? selectedObject.position.x + 50 : selectedObject.position.x - 50,
        y: selectedObject.position.y + 75,
        z: selectedObject.position.z >= 0 ? selectedObject.position.z + 50 : selectedObject.position.z - 50,

        onUpdate: function() {
            controls.target.set(selectedObject.position.x, selectedObject.position.y, selectedObject.position.z);
            controls.update();
        }

    });

    gsap.to(controls.target, {
        duration: 1.5,
        x: selectedObject.position.x,
        y: selectedObject.position.y,
        z: selectedObject.position.z,
        onUpdate: function() {controls.update();}
    });
}






wavesurfer.on('audioprocess', function() {
    if (playingParticle && wavesurfer.backend && wavesurfer.backend.peaks) {
        const peaks = wavesurfer.backend.peaks;
        if (peaks && peaks.length > 0) {
            const loudness = peaks.reduce((a, b) => Math.max(Math.abs(a), Math.abs(b))) * playingParticle.userData.loudness;
            console.log(loudness);
            updateParticleSize(playingParticle, loudness);
        }
    }
});


/* calls on mouse click function */
window.addEventListener('click', onMouseClick, false);
window.addEventListener('resize', () => {camera.aspect = window.innerWidth / window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth, window.innerHeight);});

playPauseButton.addEventListener('click', () => {
    if (wavesurfer.isPlaying()) {
        wavesurfer.pause();playPauseButton.textContent = 'Play';
    } else {
        wavesurfer.play();playPauseButton.textContent = 'Pause';
    }
});