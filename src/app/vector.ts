export class Vector {

  x:number;
  y:number;

  constructor(x:number, y:number) {
    this.x = x;
    this.y = y;
  }

  // getters

  get magnitude(): number {
    return Math.sqrt(this.x*this.x+this.y*this.y);
  }

  // in place methods

  set(a:Vector) {
    this.x = a.x;
    this.y = a.y;
    return this;
  }

  add(a:Vector) {
    this.x += a.x;
    this.y += a.y;
    return this;
  }

  sub(a:Vector) {
    this.x -= a.x;
    this.y -= a.y;
    return this;
  }

  scale(m:number) {
    this.x *= m;
    this.y *= m;
    return this;
  }

  negate() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  add_scaled(s:number, a:Vector) {
    this.x += s*a.x;
    this.y += s*a.y;
    return this;
  }

  lin_comb(s: number, a:Vector, t:number, b:Vector) {
    this.x = s*a.x + t*b.x;
    this.y = s*a.y + t*b.y;
    return this;
  }

  clear() {
    this.x = 0;
    this.y = 0;
    return this;
  }

  // static methods

  static sum(a:Vector, b:Vector): Vector {
    return new Vector(a.x+b.x, a.y+b.y);
  }

  static diff(a:Vector, b:Vector): Vector {
    return new Vector(a.x-b.x, a.y-b.y);
  }

  static zero(): Vector {
    return new Vector(0,0);
  }

  static copy(v): Vector {
    return new Vector(v.x, v.y)
  }

  static distance(a: Vector, b:Vector): number {
    return Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2));
  }

}
