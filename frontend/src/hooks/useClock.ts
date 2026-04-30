import { useState, useEffect } from "react";

export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];

  return { time, date, weekday, full: `${time} · ${date} · 星期${weekday}` };
}
