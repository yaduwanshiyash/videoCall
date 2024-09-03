const socket = io.connect();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const muteButton = document.getElementById('muteButton');
const unmuteButton = document.getElementById('unmuteButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');

const localStatus = document.getElementById('localStatus');
const remoteStatus = document.getElementById('remoteStatus');

let localStream;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.stunprotocol.org'
        }
    ]
};

// Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;

        // Notify server about new user
        socket.emit('join', 'room1');
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

// Handle messages from signaling server
socket.on('message', message => {
    if (message.offer) {
        createAnswer(message.offer);
    } else if (message.answer) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    } else if (message.muteStatus !== undefined) {
        handleRemoteMuteStatus(message.muteStatus);
    }
});

// Create offer
socket.on('ready', () => {
    createPeerConnection();
    peerConnection.addStream(localStream);

    peerConnection.createOffer()
        .then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.emit('message', { offer });
        })
        .catch(error => {
            console.error('Error creating offer.', error);
        });
});

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('message', { candidate: event.candidate });
        }
    };
}

// Create answer
function createAnswer(offer) {
    createPeerConnection();
    peerConnection.addStream(localStream);

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit('message', { answer });
        })
        .catch(error => {
            console.error('Error creating answer.', error);
        });
}

// Handle remote mute status
function handleRemoteMuteStatus(isMuted) {
    if (isMuted) {
        remoteStatus.classList.remove('hidden');
    } else {
        remoteStatus.classList.add('hidden');
    }
}

// Mute and unmute audio
muteButton.addEventListener('click', () => {
    localStream.getAudioTracks().forEach(track => track.enabled = false);
    muteButton.style.display = 'none';
    unmuteButton.style.display = 'inline';
    localStatus.classList.remove('hidden');
    socket.emit('message', { muteStatus: true });
});

unmuteButton.addEventListener('click', () => {
    localStream.getAudioTracks().forEach(track => track.enabled = true);
    unmuteButton.style.display = 'none';
    muteButton.style.display = 'inline';
    localStatus.classList.add('hidden');
    socket.emit('message', { muteStatus: false });
});

// Pause and resume video
pauseButton.addEventListener('click', () => {
    localStream.getVideoTracks().forEach(track => track.enabled = false);
    pauseButton.style.display = 'none';
    resumeButton.style.display = 'inline';
});

resumeButton.addEventListener('click', () => {
    localStream.getVideoTracks().forEach(track => track.enabled = true);
    resumeButton.style.display = 'none';
    pauseButton.style.display = 'inline';
});
