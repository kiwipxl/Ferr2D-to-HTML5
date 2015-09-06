/// <reference path="../lib-ts/pixi.js.d.ts" />

var stage: PIXI.Container;
var renderer: PIXI.CanvasRenderer | PIXI.WebGLRenderer;
const padding = 15;
var container: PIXI.ParticleContainer;
var is_adding: boolean;
var dest_scale: number = 1;
var game_layer: PIXI.Container;
var ui_layer: PIXI.Container;
var terrain_container: TerrainContainer;

var bunny: PIXI.Sprite;

var ground: PhysicsObject;
var box1: PhysicsObject;
var box2: PhysicsObject;
var edges: PhysicsObject;

var keys_down: boolean[] = [];

window.onresize = function() {
	resize_canvas();
}
function resize_canvas() {
	var w = window.innerWidth - padding;
	var h = window.innerHeight - padding;
	renderer.view.style.width = w + "px";
	renderer.view.style.height = h + "px";
	renderer.resize(w, h);
	console.log("resize: " + renderer.width + "x" + renderer.height);
}

window.onload = function() {
	// create a renderer instance
	renderer = new PIXI.WebGLRenderer(400, 300, {antialias: false});
	renderer.backgroundColor = 0x99ff77;
	document.body.appendChild(renderer.view);

	stage = new PIXI.Container();
	game_layer = new PIXI.Container();
	ui_layer = new PIXI.Container();
	stage.addChild(game_layer);
	stage.addChild(ui_layer);

	resize_canvas();

	container = new PIXI.ParticleContainer(100000, [false, true, false, false, false]);
	game_layer.addChild(container);

	init_assets(function() {
		init_physics();

		var terrain_arr = JSON.parse(raw_terrain).terrain;
		terrain_container = new TerrainContainer(terrain_arr);
		game_layer.addChild(terrain_container.container);
		game_layer.x = renderer.width / 2.0;
		game_layer.y = renderer.height / 2.0;
		game_layer.pivot.x = game_layer.width / 2.0;
		game_layer.pivot.y = game_layer.height / 2.0;

		document.ontouchstart = mouse_down;
		document.ontouchend = mouse_up;
		document.onmousedown = mouse_down;
		document.onmouseup = mouse_up;

		document.onkeydown = on_key_down;
		document.onkeyup = on_key_up;

		bunny = new PIXI.Sprite(texture_bunny);
		ui_layer.addChild(bunny);

		ground = new PhysicsObject();
		ground.create_box(400, 40);
		ground.set_pos(0 + game_layer.pivot.x - game_layer.x, 400 + game_layer.pivot.y - game_layer.y);

		box1 = new PhysicsObject(PhysicsBodyType.DYNAMIC);
		box1.create_box(bunny.width, bunny.height);
		box1.fixture.SetDensity(.5);
		box1.fixture.SetFriction(.5);
		box1.fixture.SetRestitution(.4);
		box1.body.ResetMassData();
		box1.set_pos(400 + game_layer.pivot.x - game_layer.x, game_layer.pivot.y - game_layer.y);

		box2 = new PhysicsObject(PhysicsBodyType.DYNAMIC);
		box2.create_box(bunny.width, bunny.height);
		box2.fixture.SetDensity(.5);
		box2.fixture.SetFriction(.5);
		box2.fixture.SetRestitution(.4);
		box2.body.ResetMassData();
		box2.set_pos(250 + game_layer.pivot.x - game_layer.x, game_layer.pivot.y - game_layer.y);

		edges = new PhysicsObject(PhysicsBodyType.STATIC);
		edges.create_edges(terrain_container.terrain_list[0].collider_points);
		edges.set_pos(game_layer.pivot.x - game_layer.x, game_layer.pivot.y - game_layer.y);

		game_loop();
	});
}

function on_key_down(e) {
	e = e || window.event;

	if (e.keyCode == 187) {
		dest_scale += .1;
	}else if (e.keyCode == 189) {
		dest_scale -= .1;
	}

	dest_scale = (dest_scale < .1 ) ? .1 : dest_scale;
	dest_scale = (dest_scale > 2) ? 2 : dest_scale;

	keys_down[e.keyCode] = true;
}

function on_key_up(e) {
	keys_down[e.keyCode] = false;
}

function mouse_down() {
	is_adding = true;
}

function mouse_up() {
	is_adding = false;
}

var fps = 0;
var fps_accum = 0;
var ms_accum = 0;
var frame_count = 0;
var dt = 0;
var time_step = 1.0 / 60.0;
var time_since_startup = 0;
setInterval(function() {
	console.log("fps: " + Math.round(fps_accum / frame_count) + ", ms: " + Math.round(ms_accum / frame_count));
	fps_accum = 0;
	ms_accum = 0;
	frame_count = 0;
}, 1000);

var a = 0;

function game_loop() {
	var start_time = new Date().getTime();

	update_physics();

	var v = box1.body.GetLinearVelocity();
	if (keys_down[37]) {
		v.x -= .4;
	}else if (keys_down[39]) {
		v.x += .4;
	}

	if (keys_down[38]) {
		v.y -= .4;
	}else if (keys_down[40]) {
		v.y += .4;
	}
	v.x = Math.max(v.x, -10) * .99;
	v.x = Math.min(v.x, 10) * .99;
	v.y = Math.max(v.y, -10) * .99;
	v.y = Math.min(v.y, 10) * .99;

	update_physics();

	++a;
	//ground.body.SetAngle(Math.cos(a / 10.0) / 2.0);

	/*
	var mesh = terrain_container.terrain_list[1].fill_mesh;
	var vertices = mesh.get_static_vertices();
	var indices = mesh.get_static_indices();
	var s = 20.0;
	for (var n = 0; n < indices.length; ++n) {
		var i = Number(indices[n]) * 2;
		if (n % 3 == 0) {
			graphics.moveTo(Number(vertices[i]) * s, Number(vertices[i + 1]) * s);
		}else {
			graphics.lineTo(Number(vertices[i]) * s, Number(vertices[i + 1]) * s);
		}
		if (n % 3 == 2) {
			i = Number(indices[n - 2]) * 2;
			graphics.lineTo(Number(vertices[i]) * s, Number(vertices[i + 1]) * s);
		}
	}
	graphics.endFill();
	*/

	game_layer.scale.x -= (game_layer.scale.x - dest_scale) / 4.0;
	game_layer.scale.y -= (game_layer.scale.y - dest_scale) / 4.0;
	ui_layer.scale = game_layer.scale;

	renderer.render(stage);

	dt = new Date().getTime() - start_time;
	fps = 60;
	if (dt >= time_step * 1000.0) fps = 1000.0 / dt;
	fps_accum += fps;
	ms_accum += dt;
	++frame_count;
	time_since_startup += dt;
	if (dt >= time_step * 1000.0) {
		setTimeout(game_loop, 0);
	}else {
		setTimeout(game_loop, (time_step * 1000.0) - dt);
	}
}
