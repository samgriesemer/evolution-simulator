// MIT License
// Sam Griesemer (samgriesemer.com)

m = 50;
max_o = 35;
max_vx = 10;
max_vy = 10;
organisms = [];
count = 0;
gen = 0;

function setup() {
	cnv = createCanvas(innerWidth/1.6, innerHeight/1.6);
	cnv.parent("holder");
	cnv.position((innerWidth-width)/2,(innerHeight-height)/2)
	for (i=0; i<max_o; i++) {
		organisms.push(new Organism());
	}

	diameter = 20;
	batch_size = X.rows();
	iters = 1;
	act = 1;
	clrs = [[
			[234,96,69],
			[248,202,77],
			[63,86,102]
		]];
	clr = clrs[Math.floor(Math.random()*clrs.length)]
}

function draw() {
	background(255);
	for (var t=0;t<organisms.length;t++) {
		org = organisms[t];
		org.move(organisms, t);
		org.update(false, null, organisms);
		org.display(t);

		if (dist(mouseX, mouseY, org.pos.x, org.pos.y) < org.size/2) {
			draw_network(org,org.brain.layers,act,org.pos.x,org.pos.y,100,80);
		}
	}
	balance(organisms);
	draw_network(organisms[0],organisms[0].layers,act,0,25,230,180);
	count++;
} 

// Organism class

function Organism() {
	this.size = random(20, 35);
	this.pos = createVector(random(this.size/2, width-this.size/2), random(this.size/2, height-this.size/2));
	this.vel = createVector(random(-max_vx,max_vx), random(-max_vy,max_vy));
	this.clr = color(random(255), random(255), random(255));
	this.layers = [4,12,12,12,2];
	this.brain = new NN(this.layers, 3.0, 0.1, 1.0, true);
	this.time_alive = 0;
	this.vel_list = [this.vel.x,this.vel.y];
}

Organism.prototype.move = function(orgs, t) {
	this.pos.x += this.vel.x;
	this.pos.y += this.vel.y;
	if (this.pos.x - this.size/2 > width || this.pos.x + this.size/2 < 0) { 
		orgs.splice(t,1);
	}
	if (this.pos.y - this.size/2 > height || this.pos.y + this.size/2 < 0) { 
		orgs.splice(t,1);
	}
	if (this.vel.mag() < 0.1) { 
		orgs.splice(t,1);
		console.log("killed for slowness");
	}
	if (this.time_alive > 5000) { 
		orgs.splice(t,1); 
		console.log("killed for time");
	}
}

Organism.prototype.display = function(t) {
	noFill();
	stroke(this.clr);
	strokeWeight(4);
	if (t === 0) { 
		ellipse(this.pos.x, this.pos.y, 70);
	} else {
		ellipse(this.pos.x, this.pos.y, this.size);
	}
	n_vel = createVector(this.vel.x, this.vel.y);
	n_vel.normalize();
	line(this.pos.x, this.pos.y, this.pos.x+n_vel.x*this.size/2, this.pos.y+n_vel.y*this.size/2);
}

Organism.prototype.update = function(run, Y, orgs) {
	// create X and Y for training if run
	X = Matrix.create([[this.pos.x/width, this.pos.y/height,
			this.vel.x/max_vx, this.vel.y/max_vy]]);
	if (run) { this.brain.run(X,Y,1,1); }

	// feed X through node brain & set output to velocity
	out = this.brain.fit(X,Y,true);
	this.vel.x = out.e(1,1);
	this.vel.y = out.e(1,2);
	this.vel_list.push(this.vel.x);
	this.vel_list.push(this.vel.y);
	if (this.vel_list.length > 4) {
		this.vel_list.splice(0,2);
	}
	this.time_alive++
} 

function balance(orgs) {
	fitness(orgs);
	orgs.sort(compare).reverse();
	if (orgs.length < max_o) {
		r1 = floor(Math.pow(random(),2)*orgs.length);
		r2 = floor(Math.pow(random(),2)*orgs.length);
		while (r1==r2) { r2 = floor(Math.pow(random(),2)*orgs.length); }
		parent1 = orgs[r1];
		parent2 = orgs[r2];
		o = new Organism();
		crossover(parent1, parent2, o);
		mutate(o, 0.06, 1.0);
		o.brain.fit(X,null,true);
		orgs.push(o);
		gen++;
	}
	document.getElementById("fitness").innerHTML = "Fitness: "+round(orgs[0].fitness*100)/100;
	document.getElementById("vel").innerHTML = "Velocity: "+round(orgs[0].vel.mag()*100)/100;
	document.getElementById("time").innerHTML = "Time alive: "+orgs[0].time_alive;
	document.getElementById("gen").innerHTML = "Generation: "+gen;
}

function crossover(node1, node2, child) {
	w1 = node1.brain.w;
	w2 = node2.brain.w;
	for (var i=0; i<w1.length; i++) {
		// random layer crossover
		layer = floor(random(w1[i].rows()-1))+1;
		m1 = w1[i].minor(1,1,layer,w1[i].cols());
		m2 = w2[i].minor(layer+1,1,w1[i].rows()-layer,w1[i].cols());

		child.brain.w[i] = Matrix.create(m1.transpose().augment(m2.transpose())).transpose();
		clrs = [node1.clr.levels,node2.clr.levels];
		child.clr = color(clrs[floor(random()*clrs.length)][0],
				  clrs[floor(random()*clrs.length)][1],
				  clrs[floor(random()*clrs.length)][2]);
		// random weight crossover (to be coded)

		//single point crossover (to be coded)
	}
}

function mutate(child, rate, val) {
	if (random() <= rate) {
		console.log("tate!");
		rand_layer = floor(random(child.brain.w.length));
		rand_i     = floor(random(child.brain.w[rand_layer].rows()))+1;
		rand_j     = floor(random(child.brain.w[rand_layer].cols()))+1;
		child.brain.w[rand_layer] = child.brain.w[rand_layer].map(function(x,i,j) { 
			return (rand_i==i && rand_j==j) ? x+random(-val,val) : x;
		});
	}
}

function fitness(orgs) {
	for (var i=0; i<orgs.length; i++) {
    		org = orgs[i];
		avg_vel = org.vel_list.reduce(function(a,b) { return a+b; }, 0);
		org.fitness = org.vel.mag()*44 + 30*Math.log(org.time_alive) - (1/Math.pow(org.vel.mag(),8)) - (4000/Math.pow(avg_vel,2));
	}
}

function mat_2_list(m) {
	l = [];
	m.map(function(x) { l.push(x); });
	return l;
}

function compare(a,b) {
  if (a.fitness < b.fitness)
     return -1;
  if (a.fitness > b.fitness)
    return 1;
  return 0;
}

// node class

function node(x,y) {
	this.pos = createVector(x,y);
}

node.prototype.draw_node = function(i,j,act,org) {
	nog = org.brain;
	stroke(255);
	strokeWeight(0.5);
	fill(clr[2][0],clr[2][1],clr[2][2]);
	ellipse(this.pos.x,this.pos.y,diameter);
	fill(255);
	if (i !== 0 && i < nog.layers.length-1) {
		ellipse(this.pos.x,this.pos.y,nog.acts[i-1].e(act,j+1)*(diameter-4));
	}
	else if (i == nog.layers.length-1) {
		sum = 0;
		for (var p=0; p<nog.acts[i-1].cols(); p++) { sum += Math.abs(nog.acts[i-1].e(act,p+1)); }
		ellipse(this.pos.x,this.pos.y,(nog.acts[i-1].e(act,j+1)/sum)*(diameter-4));
	}
	else if (i == 0) {
		sum = 0;
		X = Matrix.create([[org.pos.x/width, org.pos.y/height,
											org.vel.x/max_vx, org.vel.y/max_vy]]);
		ellipse(this.pos.x,this.pos.y,X.e(1,j+1)*(diameter-4));
	}
}

function create_network(sx,sy,w,h,layers,init,act,org) {
	if (init) {
		w_pad = 0;
		h_pad = 10;
		w_space = (w-2*w_pad) / layers.length;
		h_space = (h-2*h_pad);
		nodes = [];
	}
	for (var i=0; i<layers.length; i++) {
		temp_nodes = [];
		for (var j=0; j<layers[i]; j++) {
			if (init) {
				temp = new node(w_pad+(w_space/2)+w_space*i,h_pad+((h_space/(layers[i]+1))*(j+1)));
				temp.pos.x += sx;
				temp.pos.y += sy;
				temp_nodes.push(temp);
			}
			if (!init) {
				nodes[i][j].draw_node(i,j,act,org);
			}
		}
		if (init) { nodes.push(temp_nodes); }
	}
	return nodes;
}

function draw_network(org,layers,act,p1,p2,w,h) {
	nodes = create_network(p1,p2,w,h,layers,true,act,org);
	for (var i=0; i<nodes.length; i++) {
		for (var j=0; j<nodes[i].length; j++) {
			if (i != nodes.length-1) {
				for(var k=0; k<nodes[i+1].length; k++) {
					w_temp = org.brain.w[i].minor(1,2,org.brain.w[i].rows(),
													 org.brain.w[i].cols()-1);
					weight = w_temp.e(k+1,j+1);
					if (weight>=0) { 
						stroke(clr[0][0],clr[0][1],clr[0][2]); 
					} else { 
						stroke(clr[1][0],clr[1][1],clr[1][2]);
						weight *= -1;
					}
					strokeWeight(Math.pow(weight/2,1));
					line(nodes[i][j].pos.x,nodes[i][j].pos.y,
						 nodes[i+1][k].pos.x,nodes[i+1][k].pos.y);
				}
			}
		}
	}
	create_network(0,0,0,0,layers,false,act,org);
}
