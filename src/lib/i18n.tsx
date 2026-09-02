"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "zh";

type Vars = Record<string, string | number>;

/**
 * English is the source of truth in the component code (passed as `fallback`).
 * The Chinese dictionary below overrides UI strings when `lang === "zh"`.
 * Business/data content (project names, log messages, paper titles, …) is NOT
 * localized — that content originates from mock data / the future backend.
 */
const zh: Record<string, string> = {
  /* Navigation */
  "nav.dashboard": "工作台",
  "nav.projects": "项目",
  "nav.agents": "智能体",
  "nav.research": "研究",
  "nav.robotics": "机器人",
  "nav.dataCenter": "数据中心",
  "nav.activity": "活动",

  /* Brand / shell */
  "brand.controlCenter": "控制中心",
  "brand.demoData": "演示数据",
  "brand.primary": "主导航",
  "node.number": "节点 #{n}",

  /* Status labels (key = raw status value) */
  "status.online": "在线",
  "status.offline": "离线",
  "status.sleeping": "睡眠中",
  "status.unknown": "未知",
  "status.running": "运行中",
  "status.stopped": "已停止",
  "status.degraded": "降级",
  "status.idle": "空闲",
  "status.error": "错误",
  "status.paused": "已暂停",
  "status.clean": "干净",
  "status.healthy": "健康",
  "status.dirty": "有改动",
  "status.modified": "已修改",
  "status.ahead": "领先远端",
  "status.behind": "落后远端",
  "status.ready": "就绪",
  "status.completed": "已完成",
  "status.failed": "失败",
  "status.queued": "排队中",
  "status.archived": "已归档",
  "status.draft": "草稿",
  "status.active": "活跃",

  /* Project detail labels */
  "project.node": "节点",
  "project.repository": "仓库",
  "project.repositoryPath": "仓库路径",
  "project.repositoryType": "仓库类型",
  "project.remote": "远程",
  "project.branch": "分支",
  "project.head": "HEAD",
  "project.workingTree": "工作区",
  "project.modifiedFiles": "{n} 个文件已修改",
  "project.cleanFiles": "无改动",
  "project.ahead": "领先",
  "project.behind": "落后",
  "project.latestCommit": "最近提交",
  "project.commitsAhead": "领先 {n} 个提交",
  "project.commitsBehind": "落后 {n} 个提交",
  "project.noRemote": "无远程",
  "project.empty": "尚未注册任何项目。",
  "project.notFound": "未找到项目",
  "project.back": "返回项目",
  "project.noRecentCommit": "暂无提交",
  "project.activityReserved": "按项目的活动历史预留给未来的执行面（Execution Plane）。",

  /* Activity source labels */
  "source.research": "研究",
  "source.robotics": "机器人",
  "source.agent": "智能体",
  "source.system": "系统",
  "source.control": "控制",

  /* Research type labels (key = ResearchType) */
  "type.papers": "论文",
  "type.projects": "项目",
  "type.experiments": "实验",
  "type.notes": "笔记",
  "type.datasets": "数据集",
  "type.reports": "报告",

  /* Storage categories (key = category.key) */
  "storage.cat.datasets": "数据集",
  "storage.cat.models": "模型",
  "storage.cat.videos": "视频",
  "storage.cat.experiments": "实验",
  "storage.cat.papers": "论文",
  "storage.cat.backups": "备份",

  /* Section headings */
  "section.projects": "项目",
  "section.agents": "智能体",
  "section.git": "Git",
  "section.repository": "仓库",
  "section.activity": "活动",
  "section.docker": "Docker",
  "section.currentTasks": "当前任务",
  "section.recentActivity": "最近活动",
  "section.power": "电源",
  "section.system": "系统",
  "section.hardware": "硬件",
  "section.storage": "存储",
  "section.services": "服务",
  "section.trainingRuns": "训练任务",
  "section.latestExperiment": "最新实验",
  "section.experiments": "实验",

  /* Metrics */
  "metric.cpu": "CPU",
  "metric.memory": "内存",
  "metric.storage": "存储",
  "metric.network": "网络",
  "metric.temperature": "温度",
  "metric.cpuSublabel": "{load} 负载 · {cores} 核心",
  "label.of": "共 {value}",

  /* Generic labels */
  "label.ram": "内存",
  "label.cores": "核心",
  "label.uptime": "运行时长",
  "label.lastSeen": "最近在线",
  "label.lastSeenNow": "刚刚",
  "label.lastSession": "上次会话",
  "label.lastActivity": "最近活动",
  "label.task": "任务",
  "label.sim": "仿真",
  "label.lastRun": "上次运行",
  "label.platform": "平台",
  "label.os": "操作系统",
  "label.ip": "IP 地址",
  "label.chip": "芯片",
  "label.gpu": "GPU",
  "label.free": "剩余",
  "label.used": "已用",
  "label.mount": "挂载",
  "label.updated": "更新于 {time}",
  "label.driveNote": "个人 AI 数据中心",

  /* Cores detail */
  "node.coresDetail": "{p} 性能核 / {e} 能效核",

  /* Power */
  "power.awake": "已唤醒",
  "power.wake": "唤醒",
  "power.sleep": "睡眠",
  "power.prototypeNote": "Phase 2 原型 —— 仅排队命令，不执行任何 macOS 电源操作。",
  "power.queued": "睡眠命令已排队（演示 —— 未执行）",
  "power.realNote": "关闭 Mac 屏幕（屏息模式，可远程点亮唤醒）。",
  "power.battery": "电量 {battery}%",
  "power.charging": "充电中",
  "power.onBattery": "使用电池",
  "power.confirmTitle": "睡眠 {name}？",
  "power.confirmBody": "Mac 将进入睡眠，正在进行的任务可能暂停。",
  "power.sleepRequested": "已请求睡眠 · {id} · {status}",
  "power.sleepFailed": "睡眠命令失败：{msg}",

  /* Reachability (sleep detection) */
  "reachability.sleeping": "Mac 睡眠中",
  "reachability.sleepingDesc": "Mac 已睡眠，唤醒后数据将自动刷新。",
  "reachability.offlineTitle": "无法连接 Mac",
  "reachability.offlineDesc": "Mac 可能已睡眠或离线，唤醒后将自动恢复。",
  "reachability.retry": "重试",
  "reachability.woke": "我已唤醒 Mac",
  "reachability.offlineBanner": "无法连接 Mac（显示上次数据）",
  "reachability.offlineBannerDesc": "后端不可用，以下为最后一次已知数据，可能不是最新。",
  "realtime.live": "实时",
  "realtime.stale": "数据可能过期",

  /* Device pairing / authorization */
  "pair.title": "连接到此 Mac？",
  "pair.introBody": "首次连接需要输入 Mac 上显示的一次性验证码。",
  "pair.deviceCode": "设备码",
  "pair.connect": "连接",
  "pair.cancel": "取消",
  "pair.codePrompt": "输入 Mac 上显示的 6 位验证码：",
  "pair.verify": "验证",
  "pair.notConnected": "尚未连接",
  "pair.retry": "重新连接",

  /* Docker summary */
  "docker.summary": "{running} 运行中 · {stopped} 已停止",

  /* Storage overview */
  "storage.ofDrive": "占磁盘 {p}%",

  /* Common actions */
  "common.viewAll": "查看全部",
  "common.back": "返回工作台",
  "common.notFound": "未找到节点",
  "common.cancel": "取消",

  /* Activity day labels */
  "activity.today": "今天",
  "activity.yesterday": "昨天",

  /* Research filter */
  "filter.all": "全部",

  /* Page titles + descriptions */
  "page.dashboard": "工作台",
  "page.dashboardDesc": "一眼总览你的个人研究环境。",
  "page.projects": "项目",
  "page.projectsDesc": "{count} 个仓库 · {dirty} 有改动",
  "page.agents": "智能体",
  "page.agentsDesc": "{count} 个智能体 · {running} 运行中 · {idle} 空闲",
  "page.activity": "活动",
  "page.activityDesc": "整个环境所有事件的统一时间线。",
  "page.research": "研究",
  "page.researchDesc": "论文、项目、实验、笔记、数据集与报告 —— Research OS 的雏形。",
  "page.robotics": "机器人",
  "page.roboticsDesc": "机器人、仿真、训练任务与实验 —— v0.1 仅监控。",
  "page.dataCenter": "数据中心",
  "page.dataCenterDesc": "个人 AI 数据中心 —— 承载数据集、模型、实验等内容的 2TB 数据层。",
  "page.storageTitle": "{name} · 存储",
};

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggle: () => void;
  /** Translate. `fallback` is the English text shown when `lang === "en"`. */
  t: (key: string, fallback: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "silence.lang";

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key]),
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  // Read the persisted preference after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "zh" || stored === "en") setLang(stored);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const persist = useCallback((next: Language) => {
    setLang(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next = prev === "en" ? "zh" : "en";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, fallback: string, vars?: Vars): string => {
      const template = lang === "zh" ? zh[key] ?? fallback : fallback;
      return interpolate(template, vars);
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang: persist, toggle, t }),
    [lang, persist, toggle, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}