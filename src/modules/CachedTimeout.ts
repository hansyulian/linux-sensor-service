

type Action<T> = ()=>PromiseLike<T>;

export class CachedTimeout<T>{
  public cachedValue!:T;
  private action: Action<T>;
  private timeoutMs:number = 100;

  constructor(action: Action<T>, timeoutMs = 100){
    this.action = action;
    this.timeoutMs = timeoutMs;
    const self = this;
    action().then((data) => self.cachedValue = data)
  }

  public async retrieve(){
    const self = this;
    return new Promise((resolve)=>{
      var fulfilled = false;
      setTimeout(()=>{
        if (fulfilled){
          return;
        }
        fulfilled = true;
        resolve(self.cachedValue)
      },self.timeoutMs)
      self.action().then((data) => {
        self.cachedValue = data;
        if (fulfilled){
          return;
        }
        fulfilled = true;
        resolve(data);
      })
    })
  }
}