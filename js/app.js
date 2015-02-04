// Create a new instance of `HTTPServer`.
var httpServer = new HTTPServer(8080);

// Get a `Storage` object for accessing the 'sdcard'
// through DeviceStorage.
var storage = new Storage('sdcard');

// Store the root URL for accesing the HTTP server.
var rootURL;

// Listen for incoming HTTP requests.
httpServer.addEventListener('request', function(evt) {
  var request  = evt.request;
  var response = evt.response;

  // If the request method is 'POST' and the request
  // body contains a 'file' parameter, save the file.
  if (request.method === 'POST' && request.body.file) {
    saveFile(request.body.file, function() {

      // Generate the HTML for the file listing index
      // to send in the response.
      generateHTML(function(html) {
        response.send(html);
      });

      // Generate an updated file listing to render
      // locally.
      generateListing(function(html) {
        list.innerHTML = html;
      });
    });

    return;
  }

  // If the requested URL is not the root '/', get
  // the requested file and send it in the response.
  var path = decodeURIComponent(request.path);
  if (path !== '/') {
    storage.get('WebDrive' + path, function(file) {
      if (!file) {
        response.send(null, 404);
        return;
      }

      response.headers['Content-Type'] = file.type;
      response.sendFile(file);
    });

    return;
  }

  // Otherwise, generate the HTML for the file listing
  // index to send in the response.
  generateHTML(function(html) {
    response.send(html);
  });
});

// Wait for the DOM to be ready before initializing the app.
window.addEventListener('DOMContentLoaded', function(evt) {
  // Get the current IP address to determine the
  // root URL for the HTTP server.
  IPUtils.getAddresses(function(ip) {
    rootURL = address.textContent = 'http://' + ip + ':8080';

    // Generate the file listing to render locally.
    generateListing(function(listing) {
      list.innerHTML = listing;
    });
  });

  // Start the HTTP server.
  httpServer.start();
});

// Shut down the HTTP server when the app is closed.
window.addEventListener('beforeunload', function(evt) {
  httpServer.stop()
});

// Helper function to enumerate DeviceStorage and
// generate an HTML list of the files.
function generateListing(callback) {
  storage.list('WebDrive', function(directory) {
    if (!directory || Object.keys(directory).length === 0) {
      callback('<li>No files found</li>');
      return;
    }

    var html = '';
    for (var file in directory) {
      html += `<li><a href="${rootURL}/${encodeURIComponent(file)}" target="_blank">${file}</a></li>`;
    }

    callback(html);
  });
}

// Helper function to generate the HTML to serve
// for the root index.
function generateHTML(callback) {
  generateListing(function(listing) {
    var html =
`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WebDrive</title>
</head>
<body>
  <h1>WebDrive</h1>
  <form method="POST" enctype="multipart/form-data">
    <input type="file" name="file">
    <button type="submit">Upload</button>
  </form>
  <hr>
  <h3>Files</h3>
  <ul>${listing}</ul>
</body>
</html>`;

    callback(html);
  });
}

// Helper function to save an uploaded file to
// DeviceStorage.
function saveFile(file, callback) {
  var arrayBuffer = BinaryUtils.stringToArrayBuffer(file.value);
  var blob = new Blob([arrayBuffer]);

  storage.add(blob, 'WebDrive/' + file.metadata.filename, callback);
}
