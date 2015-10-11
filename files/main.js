var fileList = [
  'jquery.min.js',
  'bootstrap.min.css'
];

function getResourceList(oldVersion, newVersion) {
  return fileList.map(function (f) {
    var file = newVersion + '/' + f;
    if (oldVersion !== 'No') {
      file += '.fromv1.ubsdiff';
    }
    file += '?cachebust=' + Date.now();
    return file;
  });
}

function loadCache(version) {
  var oldVersion = 'No';
  return new Promise(function(resolve, reject) {
    resolve(getCurrentVersion());
  }).then(function(v) {
    oldVersion = v;
    return caches.open(version);
  }).then(function(cache) {
    if (oldVersion === 'No') {
      return cache.addAll(getResourceList(oldVersion, version));
    }
    // TODO
    return cache.addAll(getResourceList(oldVersion, version));
  }).then(function() {
    if (oldVersion === 'No' || oldVersion === version) {
      return;
    }
    return caches.delete(oldVersion);
  });
}

function clearAllCaches() {
  return caches.keys().then(function(cacheList) {
    return Promise.all(cacheList.map(function(cacheName) {
      return caches.delete(cacheName);
    }));
  });
}

function getCurrentVersion() {
  return caches.keys().then(function(cacheList) {
    if (cacheList.length < 1) {
      return 'No';
    } else if (cacheList.length === 1) {
      return cacheList[0];
    } else {
      throw new Error('too many Cache objects!');
    }
  });
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function reportCurrentVersion() {
  return getCurrentVersion().then(function(version) {
    setStatus(version + ' resources loaded.');
  }).catch(function(e) {
    setStatus('Loading failed: ' + e);
  });
}

function handleLoadClick(evt) {
  setStatus('Loading resources.');
  loadCache(evt.target.dataset.version).then(function() {
    return reportCurrentVersion();
  }).catch(function(e) {
    setStatus('Loading failed: ' + e);
  });
}

function handleClearClick(evt) {
  setStatus('Clearing resources.');
  clearAllCaches().then(function() {
    return reportCurrentVersion();
  }).catch(function(e) {
    setStatus('Clearing failed: ' + e);
  });
}

var buttonList = document.body.querySelectorAll('.loadbutton');
for (var i = 0; i < buttonList.length; ++i) {
  buttonList[i].addEventListener('click', handleLoadClick);
}

var clearButton = document.getElementById('clearbutton');
clearButton.addEventListener('click', handleClearClick);

reportCurrentVersion();
