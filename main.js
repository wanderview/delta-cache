var fileList = [
  'jquery.min.js',
  'bootstrap.min.css'
];

function getResourceList(oldVersion, newVersion) {
  return fileList.map(function (f) {
    var file = newVersion + '/' + f;
    if (oldVersion !== 'No') {
      file += '.from' + oldVersion + '.ubsdiff.txt';
    }
    file += '?cachebust=' + Date.now();
    return file;
  });
}

function cacheName(version) {
  return 'delta-cache-' + version;
}

function versionFromCacheName(cacheName) {
  if (cacheName.indexOf('delta-cache-') !== 0) {
    return 'No';
  }
  return cacheName.slice('delta-cache-'.length);
}

function loadPatchAndCacheResource(oldCache, newCache, loadFile, storeFile) {
  return Promise.all([
    oldCache.match(storeFile),
    fetch(loadFile)
  ]).then(function(results) {
    return Promise.all(results.map(function(response) {
      return response.arrayBuffer()
    }));
  }).then(function(results) {
    var oldBuffer = results[0];
    var patchBuffer = results[1];
    var newBuffer = ubspatch(oldBuffer, patchBuffer);
    return newCache.put(storeFile, new Response(newBuffer));
  });
}

function loadPatchAndCacheAllResources(newCache, oldVersion, newVersion) {
  var loadList = getResourceList(oldVersion, newVersion);
  return caches.open(cacheName(oldVersion)).then(function(oldCache) {
    var patchList = [];
    for (var i = 0; i < loadList.length; ++i) {
      patchList.push(loadPatchAndCacheResource(oldCache, newCache, loadList[i],
                                               fileList[i]));
    }
    return Promise.all(patchList);
  });
}

function loadAndCacheAllResources(cache, version) {
  return Promise.all(getResourceList('No', version).map(function(file) {
    return fetch(file);
  })).then(function(responseList) {
    var putList = [];
    for (var i = 0; i < responseList.length; ++i) {
      putList.push(cache.put(fileList[i], responseList[i]));
    }
    return Promise.all(putList);
  });
}

function loadCache(version) {
  var oldVersion = 'No';
  return getCurrentVersion().then(function(v) {
    oldVersion = v;
    return caches.open(cacheName(version));
  }).then(function(cache) {
    if (oldVersion === version) {
      return;
    }
    if (oldVersion === 'No') {
      return loadAndCacheAllResources(cache, version);
    }
    return loadPatchAndCacheAllResources(cache, oldVersion, version);
  }).then(function() {
    if (oldVersion === version) {
      return;
    }
    return caches.delete(cacheName(oldVersion));
  });
}

function clearAllCaches() {
  return caches.keys().then(function(cacheList) {
    return Promise.all(cacheList.filter(function(cacheName) {
      return cacheName.indexOf('delta-cache-') === 0;
    }).map(function(cacheName) {
      return caches.delete(cacheName);
    }));
  });
}

function getCurrentVersion() {
  return caches.keys().then(function(cacheList) {
    cacheList = cacheList.filter(function(name) {
      return name.indexOf('delta-cache-') === 0;
    });
    if (cacheList.length < 1) {
      return 'No';
    } else if (cacheList.length === 1) {
      return versionFromCacheName(cacheList[0]);
    } else {
      throw new Error('too many Cache objects!');
    }
  });
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function reportCurrentVersion(optionalTime) {
  var version;
  return getCurrentVersion().then(function(v) {
    version = v;
    return showResources(version);
  }).then(function() {
    var msg = version + ' resources loaded.';
    if (optionalTime !== undefined) {
      msg += ' (' + ~~optionalTime + 'ms)';
    }
    setStatus(msg);
  }).catch(function(e) {
    setStatus('Loading failed: ' + e);
  });
}

function showResources(version) {
  if (version === 'No') {
    for (var i = 0; i < fileList.length; ++i) {
      document.getElementById(fileList[i]).textContent = 'Not loaded';
    }
    return;
  }
  return caches.open(cacheName(version)).then(function(cache) {
    return Promise.all(fileList.map(function(file) {
      return cache.match(file);
    }));
  }).then(function(responseList) {
    return Promise.all(responseList.map(function(response) {
      if (!response) {
        return 'Not loaded';
      }
      return response.text();
    }));
  }).then(function(textList) {
    for (var i = 0; i < textList.length; ++i) {
      document.getElementById(fileList[i]).textContent = textList[i];
    }
  });
}

function handleLoadClick(evt) {
  setStatus('Loading resources.');
  var start = performance.now();
  loadCache(evt.target.dataset.version).then(function() {
    var end = performance.now();
    return reportCurrentVersion(end - start);
  }).catch(function(e) {
    setStatus('Loading failed: ' + e);
  });
}

function handleClearClick(evt) {
  setStatus('Clearing resources.');
  var start = performance.now();
  clearAllCaches().then(function() {
    var end = performance.now();
    return reportCurrentVersion(end - start);
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
