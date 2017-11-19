phina.define('fly.Popup', {
	superClass: 'phina.display.Shape',
	init: function(options) {
    options = ({}).$safe(options, {
			backgroundColor: 'transparent',
			fill: 'hsla(0, 0%, 0%, 0.6)',
			stroke: null,
			strokeWidth: 2,

			width: 512,
			height: 48,
			sideIndent: 32
		});
    this.superInit(options);
		this.sideIndent = options.sideIndent;
		this.label = phina.display.Label(options.label).addChildTo(this);
	},
	prerender: function(canvas) {
		var w = this.width / 2;
		var h = this.height / 2;
		canvas.beginPath()
			.moveTo(-w, -h)
			.lineTo(this.sideIndent - w, 0)
			.lineTo(-w, h)
			.lineTo(w, h)
			.lineTo(w - this.sideIndent, 0)
			.lineTo(w, -h)
			.closePath();
	},
	initThreeMesh: function() {
		var group = new THREE.Group();
		var shape = new THREE.Shape();
		shape.moveTo(-1, -0.5)
		shape.lineTo(0, 0)
		shape.lineTo(-1, 0.5)
		shape.lineTo(0, 0.5)
		shape.lineTo(0, -0.5)
		shape.lineTo(-1, -0.5)
		var side = new THREE.ShapeGeometry(shape);
		var center = new THREE.PlaneGeometry(1, 1);
		group.fill = new THREE.Mesh(center, new THREE.MeshBasicMaterial());
		group.fill.position.z = 1;
		group.stroke = new THREE.Mesh(center, new THREE.MeshBasicMaterial());
		group.fillleft = new THREE.Mesh(side, new THREE.MeshBasicMaterial());
		group.fillleft.position.z = 1;
		group.strokeleft = new THREE.Mesh(side, new THREE.MeshBasicMaterial());
		group.fillright = new THREE.Mesh(side, new THREE.MeshBasicMaterial({side: THREE.BackSide}));
		group.fillright.position.z = 1;
		group.strokeright = new THREE.Mesh(side, new THREE.MeshBasicMaterial({side: THREE.BackSide}));
		group.add(group.stroke);
		group.add(group.fill);
		group.add(group.strokeleft);
		group.add(group.fillleft);
		group.add(group.strokeright);
		group.add(group.fillright);
		return group;
	},
	updateThreeMesh: function(group, alpha) {
		function setColor(material, str, opacity) {
	    if (!str) {
	      material.visible = false;
	      return;
	    }
	    var color = phina.util.Color().setFromString(str);
	    if (!color.a) {
	      material.visible = false;
	      return;
	    }
	    material.color = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
	    color.a *= opacity !== undefined ? opacity : 1;
	    material.opacity = color.a;
	    material.transparent = color.a !== 1;
	    material.visible = true;
	  }
		var centerwidth = this.width - this.sideIndent * 2;
		setColor(group.fill.material, this.fill, alpha);
		group.fill.scale.set(centerwidth * this.scaleX, this.height * this.scaleY, 1);
		setColor(group.stroke.material, this.stroke, alpha);
		group.stroke.scale.set((1 + this.strokeWidth / centerwidth) * centerwidth * this.scaleX, (1 + this.strokeWidth / this.height) * this.height * this.scaleY, 1);
		setColor(group.fillleft.material, this.fill, alpha);
		group.fillleft.scale.set(this.sideIndent * 2 * this.scaleX, this.height * this.scaleY, 1);
		group.fillleft.position.x = -centerwidth * this.scaleX / 2;
		setColor(group.strokeleft.material, this.stroke, alpha);
		group.strokeleft.scale.set((1 + this.strokeWidth / this.sideIndent / 2) * this.sideIndent * 2 * this.scaleX, (1 + this.strokeWidth / this.height) * this.height * this.scaleY, 1);
		group.strokeleft.position.x = -centerwidth * this.scaleX / 2;
		setColor(group.fillright.material, this.fill, alpha);
		group.fillright.scale.set(-this.sideIndent * 2 * this.scaleX, this.height * this.scaleY, 1);
		group.fillright.position.x = centerwidth * this.scaleX / 2;
		setColor(group.strokeright.material, this.stroke, alpha);
		group.strokeright.scale.set(-(1 + this.strokeWidth / this.sideIndent / 2) * this.sideIndent * 2 * this.scaleX, (1 + this.strokeWidth / this.height) * this.height * this.scaleY, 1);
		group.strokeright.position.x = centerwidth * this.scaleX / 2;
	}
});
