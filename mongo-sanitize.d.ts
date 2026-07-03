declare module 'mongo-sanitize' {
  function sanitize<T>(v: T): T;
  export = sanitize;
}
