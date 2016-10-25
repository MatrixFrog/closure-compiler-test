This project is to demo a potential bug of closure compiler, which causes the latter to generate
invalid warnings like:
<pre>
externs.zip//w3c_rtc.js:924: WARNING - property addEventListener on interface EventTarget is not
implemented by type RTCPeerConnection
function RTCPeerConnection(configuration, constraints) {}
^

externs.zip//w3c_rtc.js:924: WARNING - property dispatchEvent on interface EventTarget is not
implemented by type RTCPeerConnection
function RTCPeerConnection(configuration, constraints) {}
^

externs.zip//w3c_rtc.js:924: WARNING - property removeEventListener on interface EventTarget is not
implemented by type RTCPeerConnection
function RTCPeerConnection(configuration, constraints) {}
</pre>
