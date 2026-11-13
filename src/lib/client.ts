export async function post<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? "요청에 실패했습니다.") as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

const NAME_KEY = "mg:name";

// 시크릿 창 등에서는 localStorage 접근이 막힐 수 있어 모두 감쌉니다.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장하지 못해도 이번 접속에는 지장이 없습니다.
  }
}

export const savedName = () => read(NAME_KEY) ?? "";
export const saveName = (name: string) => write(NAME_KEY, name);
