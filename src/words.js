// 표시 낱말은 한 곳에서 바꾼다. 검사는 학습 설정을 저장하지 않고 격리한다.
let wordTestSettings = null;
function wordSettings() {
  return wordTestSettings || (typeof saveData !== "undefined" ? saveData.settings : { bassWord: "밑음", invWord: "자리바꿈" });
}
function withWords(settings, fn) {
  const previous = wordTestSettings;
  wordTestSettings = settings;
  try { return fn(); } finally { wordTestSettings = previous; }
}
const WORDS = {
  root: "근음", rootEn: "Root", bassEn: "Bass",
  get bass() { return wordSettings().bassWord || "밑음"; },
  get inv() { return INV_KO.map((text, k) => wordSettings().invWord === "전위" ? ["기본위치", "제1전위", "제2전위", "제3전위"][k] : text); },
  get invShort() { return wordSettings().invWord === "전위" ? ["기본위치", "제1전위", "제2전위", "제3전위"] : INV_SHORT; }
};
const invName = k => WORDS.inv[k];
const invShort = k => WORDS.invShort[k];
function translateWords(text) {
  let result = String(text);
  if (wordSettings().bassWord === "베이스") {
    result = result.replaceAll("밑음은", "베이스는").replaceAll("밑음이", "베이스가")
      .replaceAll("밑음을", "베이스를").replaceAll("밑음과", "베이스와")
      .replaceAll("밑음으로", "베이스로").replaceAll("밑음이에요", "베이스예요")
      .replaceAll("밑음", "베이스");
  }
  if (wordSettings().invWord === "전위") {
    for (const [oldWord, newWord] of [["첫째 자리바꿈", "제1전위"], ["둘째 자리바꿈", "제2전위"], ["셋째 자리바꿈", "제3전위"]]) {
      result = result.replaceAll(oldWord + "이에요", newWord + "예요")
        .replaceAll(oldWord + "은", newWord + "는").replaceAll(oldWord + "이", newWord + "가")
        .replaceAll(oldWord + "을", newWord + "를").replaceAll(oldWord, newWord);
    }
    result = result.replaceAll("기본 위치", "기본위치").replaceAll("자리바꿈", "전위");
  }
  return result;
}
