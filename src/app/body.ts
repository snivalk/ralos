import { Vector } from './vector';

export class Body {

  position: Vector;
  velocity: Vector;
  acceleration: Vector;

  radius = 0;
  mass = 1;
  absorbed = false;
  just_collided = 0;
  name = null;
  trajectory = [];
  show_trajectory = false;
  t = 0;
  prev_t = 0;

  constructor(position:Vector, mass:number) {
    this.position = position;
    this.velocity = Vector.zero();
    this.acceleration = Vector.zero();
    this.mass = mass;
    this.radius_from_mass();
    this.trajectory.push(Vector.copy(position));
  }

  get momentum(): Vector {
    return this.velocity.scale(this.mass);
  }

  radius_from_mass(): number {
    this.radius = Math.pow(this.mass/(4*Math.PI),1.0/3);
    return this.radius;
  }

  mass_from_radius():number {
    this.mass = 4*Math.PI*Math.pow(this.radius,3);
    return this.mass;
  }

  integrate(dt:number) {
    this.velocity.add_scaled(dt,this.acceleration);
    this.position.add_scaled(dt,this.velocity);
    this.t += dt;
    if ( this.name && this.t - this.prev_t > 0.05 ) {
      this.trajectory.unshift(Vector.copy(this.position));
      if ( this.trajectory.length > 4000 ) {
        this.trajectory.pop();
      }
      this.prev_t = this.t;
    }
  }

  path(zoom,camera) {
    let p = "M " + zoom*(this.position.x-camera.x) + " " + zoom*(this.position.y-camera.y) + " ";
    for ( var i = 0; i<this.trajectory.length; i++ ) {
      p += "L " + zoom*(this.trajectory[i].x-camera.x) + " " + zoom*(this.trajectory[i].y-camera.y) + " ";
    }
    return p;
  }

}
