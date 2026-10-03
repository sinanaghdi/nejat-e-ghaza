const offers = [
  { id: 1, title: "Surprise Food Box", merchant: "Sample Cafe", price: "120,000", original: "250,000", quantity: 4 },
  { id: 2, title: "Pastry Box", merchant: "Daily Bakery", price: "80,000", original: "160,000", quantity: 7 },
  { id: 3, title: "Dinner Box", merchant: "Green Kitchen", price: "150,000", original: "300,000", quantity: 3 },
];

function App() {
  return (
    <main className="app">
      <nav className="nav">
        <div className="brand">نجات غذا</div>
        <div className="nav-links">
          <a href="#offers">پیشنهادها</a>
          <a href="#how-it-works">چطور کار می‌کند؟</a>
          <button className="login-button">ورود</button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">غذا کمتر هدر برود</p>
          <h1>غذای خوب را نجات بده.</h1>
          <p className="hero-copy">
            غذاهای مازاد کافه‌ها، رستوران‌ها و فست‌فودها را با قیمت کمتر پیدا کن،
            سفارش بده و در زمان مشخص تحویل بگیر.
          </p>
          <a className="primary-button" href="#offers">مشاهده پیشنهادها</a>
        </div>
      </section>

      <section id="offers" className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">امروز نزدیک تو</p>
            <h2>پیشنهادهای غذایی</h2>
          </div>
          <span className="muted">نمونه داده — اتصال API در مرحله بعد</span>
        </div>

        <div className="offer-grid">
          {offers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              <div className="offer-image">🍱</div>
              <div className="offer-content">
                <span className="merchant">{offer.merchant}</span>
                <h3>{offer.title}</h3>
                <div className="price-row">
                  <strong>{offer.price} تومان</strong>
                  <del>{offer.original}</del>
                </div>
                <p className="muted">{offer.quantity} عدد باقی مانده</p>
                <button className="secondary-button">مشاهده</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section steps">
        <div>
          <span className="step-number">01</span>
          <h3>پیدا کن</h3>
          <p>پیشنهادهای غذایی اطراف خودت را ببین.</p>
        </div>
        <div>
          <span className="step-number">02</span>
          <h3>رزرو کن</h3>
          <p>غذای موردنظر را با قیمت تخفیف‌خورده سفارش بده.</p>
        </div>
        <div>
          <span className="step-number">03</span>
          <h3>تحویل بگیر</h3>
          <p>در بازه مشخص‌شده به فروشنده مراجعه کن.</p>
        </div>
      </section>
    </main>
  );
}

export default App;