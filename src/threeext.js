var threeext = threeext || {};
threeext.$method('extention', function() {
	THREE.$method('$extend', function(a, o) {
		var arg = Array.prototype.slice.call(arguments);
		arg.shift();
		Array.prototype.forEach.call(arg, function(source) {
			for (var property in source) {
				if (a[property] && o[property] && o[property].className && o[property].className.substr(0, 6) === 'THREE.') {
					a[property].copy(o[property]);
				} else {
					a[property] = o[property];
				}
			}
		}, this);
		return a;
	});
	THREE.$method('$add', function(a, o) {
		var arg = Array.prototype.slice.call(arguments);
		arg.shift();
		Array.prototype.forEach.call(arg, function(source) {
			for (var property in source) {
				if (o[property]) {
				} else {
					if (a[property] && o[property] && o[property].className && o[property].className.substr(0, 6) === 'THREE.') {
						a[property].add(o[property]);
					} else {
						a[property] += o[property];
					}
				}
			}
		}, this);
		return a;
	});
	THREE.$method('applyToAllMaterial', function(m, f) {
		if (Array.isArray(m)) m.each(f);
		else f(m);
	});
	THREE.Object3D.prototype.$method('rotate', function(x, y, z) {
		this.quaternion.rotate(x, y, z);
	});
	THREE.Object3D.prototype.$method('move', function(d) {
		this.position.x = d.x;
		this.position.y = d.y;
		this.position.z = d.z;
		return this;
	});
	THREE.Object3D.prototype.$method('rotateAbsX', function(r) {
		this.quaternion.rotateAbsX(r);
	});
	THREE.Object3D.prototype.$method('rotateAbsY', function(r) {
		this.quaternion.rotateAbsY(r);
	});
	THREE.Object3D.prototype.$method('rotateAbsZ', function(r) {
		this.quaternion.rotateAbsZ(r);
	});
	THREE.Mesh.prototype.$method('deepclone', function (clonegeometry, clonematerial) {
		return new this.constructor(clonegeometry ? this.geometry.clone() : this.geometry, clonematerial ? this.material.clone(true) : this.material).copy(this);
	});
	THREE.Mesh.prototype.getter('tweener', function() {
    if (!this._tweener) {
      this._tweener = phina.accessory.Tweener().attachTo(this);
    }
    return this._tweener;
  });
	(function() {
	  var methods = [
	    'addEventListener', 'on',
	    'removeEventListener', 'off',
	    'clearEventListener', 'clear',
	    'hasEventListener', 'has',
	    'dispatchEvent', 'fire',
	    'dispatchEventByType', 'flare',
			'attach', 'attachTo', 'detach',
	  ];
	  methods.each(function(name) {
	    THREE.Mesh.prototype.$method(name, phina.app.Element.prototype[name]);
			THREE.Vector3.prototype.$method(name, phina.app.Element.prototype[name]);
	  });
	})();
	THREE.Mesh.prototype._listeners = {};
	THREE.Vector3.prototype._listeners = {};
	THREE.Vector3.prototype.className = 'THREE.Vector3';
	THREE.Quaternion.prototype.className = 'THREE.Quaternion';
	THREE.Quaternion.prototype.$method('rotate', function(x, y, z) {
		x && this.rotateAbsX(x);
		y && this.rotateAbsY(y);
		z && this.rotateAbsZ(z);
		return this;
	});
	THREE.Quaternion.prototype.$method('rotateX', function(r) {
		return this.multiply(new THREE.Quaternion().setFromAxisAngle(Axis.x, r));
	});
	THREE.Quaternion.prototype.$method('rotateY', function(r) {
		return this.multiply(new THREE.Quaternion().setFromAxisAngle(Axis.y, r));
	});
	THREE.Quaternion.prototype.$method('rotateZ', function(r) {
		return this.multiply(new THREE.Quaternion().setFromAxisAngle(Axis.z, r));
	});
	THREE.Quaternion.prototype.$method('rotateAbsX', function(r) {
		return this.premultiply(new THREE.Quaternion().setFromAxisAngle(Axis.x, r));
	});
	THREE.Quaternion.prototype.$method('rotateAbsY', function(r) {
		return this.premultiply(new THREE.Quaternion().setFromAxisAngle(Axis.y, r));
	});
	THREE.Quaternion.prototype.$method('rotateAbsZ', function(r) {
		return this.premultiply(new THREE.Quaternion().setFromAxisAngle(Axis.z, r));
	});
	THREE.Vector3.prototype.getter('tweener', function() {
    if (!this._tweener) {
      this._tweener = phina.accessory.Tweener().attachTo(this);
    }
    return this._tweener;
  });
	THREE.MultiMaterial.prototype.accessor('opacity', {
		set: function(p) {
			for (var i = 0; i < this.materials.length; i++) {
				this.materials[i].opacity = p;
			}
		},
		get: function() {return this.materials[0].opacity;}
  });
});
