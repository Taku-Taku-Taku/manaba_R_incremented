const taskListURLs = {
  query: "https://ct.ritsumei.ac.jp/ct/home_summary_query",
  survey: "https://ct.ritsumei.ac.jp/ct/home_summary_survey",
  report: "https://ct.ritsumei.ac.jp/ct/home_summary_report",
} as const;

export type TaskInfo = {
  url: string | null | undefined;
  courseUrl: string | null | undefined;
  title: string | null | undefined;
  course: string | null | undefined;
  due: string | null | undefined;
};

export type TaskType = keyof typeof taskListURLs;

export type TasksInfo = Record<TaskType, TaskInfo[]>;

const fetchTaskInfo = async (type: TaskType): Promise<TaskInfo[]> => {
  const result = await fetch(taskListURLs[type]);
  const htmlText = await result.text();

  const domparser = new DOMParser();
  const doc = domparser.parseFromString(htmlText, "text/html");

  validateSource(doc);
  const taskTrs = Array.from(
    doc.querySelectorAll(".stdlist > tbody > tr"),
  ).filter((e) => !e.classList.contains("title"));

  return taskTrs.map((tr) => {
    const a = tr.querySelector("a");
    const taskPath = a?.getAttribute("href");
    const coursePath = taskPath?.replace(/_[a-z]+_[0-9]+/, "");

    return {
      url: taskPath && `https://ct.ritsumei.ac.jp/ct/${taskPath}`,
      courseUrl: coursePath && `https://ct.ritsumei.ac.jp/ct/${coursePath}`,
      title: tr.querySelector("h3")?.innerText.replace(/\s+/g, " "),
      course: tr?.children[1]?.innerHTML.replace(/\s+/g, " "),
      due: tr?.children[2]?.innerHTML.replace(/\s+/g, " "),
    };
  });
};

const validateSource = (doc: Document) => {
  // タスクのテーブルの要素について検証
  const trs = doc.querySelectorAll(".stdlist > tbody > tr");

  // 要素が存在することを確認
  if (trs.length === 0) {
    throw new Error("Invalid source: task table header not found");
  }

  // テーブルのヘッダーの内容が正しいことを確認
  const header = trs[0]?.children;
  if (typeof header === "undefined") {
    throw new Error("Invalid source: task table header not found");
  }
  if (header[0] && header[0]?.innerHTML.replace(/\s+/g, " ") !== "タイトル") {
    throw new Error("Invalid source: task table does not have タイトル column");
  }
  if (header[1] && header[1].innerHTML.replace(/\s+/g, " ") !== "コース名") {
    throw new Error("Invalid source: task table does not have コース名 column");
  }
  if (
    header[2] &&
    header[2].innerHTML.replace(/\s+/g, " ") !== "受付終了日時"
  ) {
    throw new Error(
      "Invalid source: task table does not have 受付終了日時 column",
    );
  }
};

export const fetchTasksInfo = async (): Promise<TasksInfo> => {
  const fetching = (["query", "survey", "report"] as const).map(
    async (type) => [type, await fetchTaskInfo(type)],
  );

  return Object.fromEntries(await Promise.all(fetching));
};
