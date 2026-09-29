# 로컬 실행법

Windows 11 기준으로 실제로 돌려 본 순서임. macOS와 Linux는 명령이 같고, 경로와 Ghostscript 설치만 다름.

## 1. 준비물

| 무엇 | 확인 명령 | 비고 |
|---|---|---|
| Git | `git --version` | |
| Bun 1.2 이상 | `bun --version` | 1.3.14에서 확인함 |
| Python 3.9 이상, PyMuPDF, numpy | `python -c "import fitz, numpy"` | `pip install pymupdf numpy` |
| Ghostscript (권장) | `gswin64c -v` | 투명도를 무시하는 뷰어 검사에 씀. Windows는 `C:\Program Files\gs\...`에 설치되면 자동으로 찾음 |
| Figma 데스크톱 앱 | | 개발 플러그인을 쓰려면 데스크톱 앱이 필요함 |
| 글꼴 Google Sans Flex, Google Sans Code, Roboto | Figma 글꼴 목록 | 로컬에 설치함. Google Sans Flex가 없으면 kit이 멈추고 알려 줌(Inter로 몰래 바꾸지 않음) |

## 2. 받기와 빌드

```bash
git clone https://github.com/JeonSeongHu/paper-to-figma.git
cd paper-to-figma
bun install
bun run build
bun test
```

`bun run build`는 Figma 플러그인(`plugin/code.js`)과 스크립트용 kit(`kit/dist/kit.js`)을 만듦. `bun test`는 테스트 13개가 통과해야 함.

## 3. Figma 연결

연결 방법은 둘임. 처음이면 A를 씀.

### A. 전용 플러그인 (권장)

1. 페어링 코드를 만듦. 출력된 코드는 남에게 보이지 않게 둠.
   ```bash
   bun run setup
   ```
2. 새 터미널에서 relay를 켜 두고 닫지 않음. `paper-to-figma relay listening on 127.0.0.1:3057`이 나오면 정상임.
   ```bash
   bun run relay
   ```
3. Figma 데스크톱 앱에서 figure를 둘 파일을 엶.
4. **Plugins > Development > Import plugin from manifest**에서 저장소의 `plugin/manifest.json`을 고름.
5. **Paper to Figma** 플러그인을 실행하고, 페어링 코드를 붙여 넣은 뒤 **Connect**를 누름.
6. 방법론 figure나 teaser처럼 스크립트로 그리는 figure를 만들 거면 **Allow scripts**를 켬. 그래프와 레이더(spec)는 꺼 둔 채로도 그려짐.
7. 연결을 확인함. `"connected": true`와 지금 페이지 이름이 나오면 됨.
   ```bash
   bun run doctor
   ```

`plugin/code.js`를 다시 빌드했으면 Windows에서는 Figma를 완전히 종료하고 다시 켜야 새 코드가 적용됨.

### B. 이미 쓰는 Talk to Figma가 있을 때

`execute_code` 명령이 있는 Talk to Figma 플러그인과 relay(3055 포트)가 켜져 있으면, 그 연결을 그대로 씀. 명령마다 kit을 함께 보내고, kit 소스가 바뀌었으면 자동으로 다시 빌드함.

```powershell
$env:P2F_TRANSPORT = "talk-to-figma"; $env:P2F_CHANNEL = "<플러그인 창에 나온 채널>"
bun run doctor
```

bash에서는 `export P2F_TRANSPORT=talk-to-figma P2F_CHANNEL=<채널>`임. 이 경로에는 "Allow scripts" 스위치가 없음. Talk to Figma 플러그인은 받은 코드를 그대로 실행하기 때문임.

## 4. 에이전트 연결

Claude Code에서는 플러그인으로 설치함. 스킬과 MCP 서버가 함께 들어옴.

```bash
claude plugin marketplace add ./paper-to-figma --scope project
claude plugin install paper-to-figma@paper-to-figma
claude plugin validate ./paper-to-figma
```

GitHub에서 받을 때는 `claude plugin marketplace add JeonSeongHu/paper-to-figma --scope project`로 추가함. MCP 서버만 따로 붙이려면 `bun run setup`이 출력한 `claude mcp add ...` 또는 `codex mcp add ...` 명령을 씀.

## 5. 예제로 확인

합성 논문(`examples/anon-paper/paper.md`, 수치는 모두 지어낸 값)으로 전체 흐름을 확인함. 페이지 이름은 Figma 파일에 있는 페이지로 바꿈.

```bash
bun src/cli.mjs prepare examples/anon-paper --name anchor
bun src/cli.mjs check examples/anon-paper/figures/training-curves.json --paper anchor
bun src/cli.mjs build examples/anon-paper/figures/training-curves.json --paper anchor --page "Figures"
bun src/cli.mjs build examples/anon-paper/figures/per-task-bars.json --paper anchor --page "Figures"
bun src/cli.mjs build examples/anon-paper/figures/summary-radar.json --paper anchor --page "Figures"
bun src/cli.mjs script examples/anon-paper/figures/overview.js --args "{\"page\": \"Figures\"}"
bun src/cli.mjs verify "Anchor Tokens / training curves" --paper anchor --page "Figures" --spec examples/anon-paper/figures/training-curves.json
```

이 PC에서 확인한 결과는 이렇음.

- **`prepare`:** 표 T1, T2, T3을 찾음.
- **`check`:** 세 spec의 수치 24개, 12개, 18개가 모두 원문과 일치함.
- **자동 레이아웃:** 학습 곡선은 0.47, 막대그래프는 0.57, 레이더는 0.5 폭(`\linewidth` 대비)으로 정함.
- **`verify`:** 네 figure 모두 PASS이고, soft mask 0개, 투명 값 없음, 투명도를 끈 렌더와의 차이 0임.
- **가장자리 여백:** 1~11px이고, 모두 경고 기준(12px)보다 작음. 막대그래프 좌우 11px는 y축 눈금 숫자 왼쪽의 빈칸임.

`verify` 보고서는 `work/anchor/verify-*.md`이고, 렌더는 `work/anchor/qa/*.normal.png`(일반)와 `*.notransparency.png`(투명도 무시)임. 두 렌더를 직접 열어 봄.

## 6. 내 논문으로

1. 논문 원본을 `work/<이름>/` 아래에 둠. `work/`는 git에서 빠지므로 심사 중인 논문도 저장소에 올라가지 않음.
   - TeX 폴더를 넣거나 Markdown으로 둠.
   - PDF만 있으면 텍스트로 뽑음: `python -c "import fitz,sys; print('\n'.join(p.get_text() for p in fitz.open(sys.argv[1])))" paper.pdf > work/mypaper/paper.txt`
   - PDF에서 뽑은 표는 신뢰도가 낮게 표시되니 행을 원문과 대조함.
2. 에이전트에게 요청함. 예시:
   > paper-to-figma 스킬로 work/mypaper/paper.txt 논문의 figure를 만들어 줘. Figma의 "Figures" 페이지에 두고, 각 figure를 verify까지 해서 보고해 줘.
3. 에이전트는 다음 순서로 진행함.
   1. `prepare`로 논문을 정리함.
   2. `figure-plan.md`에 figure 계획을 씀.
   3. 그래프는 spec으로, 다이어그램은 스크립트로 만듦.
   4. `verify`와 렌더 확인을 문제가 없을 때까지 반복함.
   5. figure마다 결과를 보고함.

## 7. 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `Relay unavailable; run bun run relay` | relay가 꺼져 있음. 다른 터미널에서 `bun run relay`를 켬 |
| `Figma plugin not connected` | 플러그인 창을 닫았거나 코드가 다름. 플러그인에서 다시 Connect |
| `Pairing role already occupied` | 같은 코드로 에이전트가 두 개 붙어 있음. 앞의 명령이 끝나기를 기다림 |
| `Scripts are off` | 플러그인 창에서 Allow scripts를 켬 |
| `Font missing in Figma: Google Sans Flex` | 글꼴을 설치하고 Figma를 다시 켬 |
| 빌드가 수 분 걸림 | 프레임이 많은 페이지에서 그리면 느림. `--page`로 가벼운 페이지를 지정하면 그 페이지로 옮겨서 그림. Figma 창이 뒤에 가려져 있으면 느려질 수 있음 |
| `code.js`를 고쳤는데 그대로임 | Windows에서 Figma가 플러그인을 캐싱함. 앱을 완전히 종료 후 재시작 |
| `Ghostscript not found` | 설치하면 투명도 검사가 켜짐. 없으면 경고만 남기고 나머지 검사는 진행함 |
| `timed out` 후 다시 실행 | 쓰기가 끝났을 수 있음. 같은 이름 프레임이 있는지 `doctor`로 보고 다시 실행함(같은 이름은 제자리에서 교체됨) |
