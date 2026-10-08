import { useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button, Field } from "./PrototypeUI";

export default function PrototypeLogin({ onEnter }: { onEnter: () => void }) {
  const [account, setAccount] = useState("demo-admin");
  const [password, setPassword] = useState("demo2026");
  const [visible, setVisible] = useState(false);
  return <div className="prototype-app premium-login">
    <section className="login-story">
      <div className="login-brand"><img src="/design-assets/safety-logo-v3.png" alt="国控安全标志" /><div><strong>国控安全</strong><span>GUOKONG SAFETY</span></div></div>
      <div className="login-statement"><span className="login-kicker">INTELLIGENCE FOR A SAFER TOMORROW</span><h1>让每一次检查，<br />都有安全的回响。</h1><p>连接现场、智能分析与专家经验，<br />让风险可见，让整改有据。</p><div className="login-capabilities"><span>智能现场检查</span><i /><span>专家协同</span><i /><span>隐患闭环</span></div></div>
      <footer>山东省国控企业管理有限公司<span>消防与用电安全智能检查服务平台</span></footer>
    </section>
    <section className="login-access"><span className="login-demo-label"><ShieldCheck size={15} /> 产品演示环境</span><div className="login-form-wrap"><span className="eyebrow">WELCOME BACK</span><h2>欢迎使用国控安全</h2><p>从这里开启高效、有序的安全检查工作。</p><form onSubmit={e => { e.preventDefault(); if (account.trim() && password.trim()) onEnter(); }}>
      <Field label="演示账号"><input value={account} autoComplete="off" required onChange={e => setAccount(e.target.value)} placeholder="请输入演示账号" /></Field>
      <Field label="演示密码"><span className="login-password"><input type={visible ? "text" : "password"} value={password} required autoComplete="off" onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? "隐藏演示密码" : "显示演示密码"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></Field>
      <p className="login-hint">已填入演示账号，无需注册。请勿输入真实密码。</p><Button type="submit">进入工作台 <ArrowRight size={17} /></Button>
    </form><div className="login-disclaimer">本页面用于产品体验，展示本地演示数据。</div></div><footer>安全检查 · 有据可循</footer></section>
  </div>;
}
