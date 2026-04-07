# ![SSARVIS Banner](./assets/img/banner.png) 
> **"나의 목소리와 성격을 닮은 페르소나 에이전트"**

SSARVIS는 사용자의 고유한 성격과 목소리를 학습하여 디지털로 복제하고, 지인들의 피드백을 통해 객관적인 '페르소나'를 시각화하는 AI 플랫폼입니다.

---

## 🚀 핵심 기능

### 👤 나의 클론 AI
- **성격 모델링**: 심도 있는 설문을 통해 가치관, 대화 습관, 감정 반응 패턴을 분석하여 나를 대변하는 AI를 생성합니다.
- **음성 복제**: 단 몇 초의 음성 데이터만으로 사용자의 음색과 억양을 학습하여 AI가 내 목소리로 답변합니다.

### 👥 남이 보는 나
- **소셜 페르소나**: 지인들이 작성한 설문 데이터를 수집하여, 내가 몰랐던 나의 사회적 모습을 반영한 전용 AI를 구축합니다.
- **진화형 페르소나**: 데이터가 축적될수록 AI의 레벨이 상승하며, 더욱 정교하고 입체적인 성격 모델로 진화합니다.

### ⚔️ 스스로 대화하는 AI
- **자동 토론**: "내가 생각하는 나"와 "남이 보는 나" 두 AI가 특정 주제에 대해 토론하는 모습을 실시간으로 관찰할 수 있습니다.
- **자아 탐구**: 두 페르소나 간의 대화를 통해 주관적 자아와 객관적 자아 사이의 간극을 흥미롭게 발견합니다.

---

## 🛠 핵심 기술

### 📡 실시간 스트리밍
- **WebSocket 파이프라인**: 프론트엔트와 백엔드, AI 서버에 이르기까지 텍스트와 음성 데이터를 분할 스트리밍하여 응답 지연 시간을 최소화했습니다.
- **Web Speech API**: 웹 브라우저에서 음성인식을 처리하여 백엔드나 AI서버의 부하를 줄이고 실시간성을 확보했습니다.

### 3D 캐릭터
- **Spline & Three.js**: 생동감 있는 3D 캐릭터를 구현하여 사용자에게 몰입감 있는 경험을 제공합니다.

### 🧠 페르소나 추출 엔진
- **메타 프롬프팅**: LLM을 활용한 시스템 프롬프트 생성 알고리즘을 통해 행동을 지시하는 시스템 프롬프트 작성 기능을 구현했습니다.
- **누적 학습**: 새로운 데이터가 입력될 때마다 기존 정체성을 유지하면서도 점진적으로 업데이트되는 구조를 채택했습니다.

### 🎙️ 하이브리드 TTS 아키텍처
- **TTS 라우팅 전략**: 빈번한 요청이 발생하는 핵심 페르소나는 자체적으로 파인튜닝된 VITS 모델을 우선적으로 호출하고, 새로운 음성과 높은 빈도로 호출되지 않는 요청은 외부 TTS API(DashScope)로 분산 처리합니다.
- **자원 최적화**: 경량 인퍼런스 엔진을 통해 저사양 환경에서도 고품질의 음성 합성을 지원하며, 외부 서비스 의존도를 낮춰 운영 비용을 획기적으로 절감했습니다.

### 🔒 개인정보 및 컨텍스트 관리
- **메모리 정책**: 일반 대화는 벡터 DB(Qdrant)에 저장하여 장기 기억을 형성하고, 비밀 모드(Lock Mode)에서는 민감 정보 유출을 차단합니다.

---

## 🛠 기술 스택

### Backend
![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![SpringBoot](https://img.shields.io/badge/SpringBoot-3.5-6DB33F?logo=springboot&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Latest-DC382D?logo=redis&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-R3F-000000?logo=three.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

### AI & Voice
![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![VITS](https://img.shields.io/badge/VITS-Zero--Shot-blue?logo=pytorch&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-DE133B?logo=qdrant&logoColor=white)
![uv](https://img.shields.io/badge/uv-Package_Manager-4C51BF)
---

## 🏗 시스템 아키텍쳐

![System Architecture](./assets/img/system_architecture.png)

---

## 🚀 시작하기

### 1. Prerequisites
- **Java 21**
- **Python 3.11+** (uv recommended)
- **Node.js 20+**
- **Docker & Docker Compose**

### 2. Local Execution

#### AI Server
```bash
cd ai
uv sync
uv run main.py
```

#### Backend 

```bash
cd backend
./gradlew bootRun
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 👨‍👩‍👧‍👦 팀 보이스 아자스

<table>
  <tr>
    <td align="center" width="250">
      <img src="./assets/img/empty_user.png" width="120" style="border-radius: 50%;">
      <br>
      <strong>김형택 (팀장)</strong>
    </td>
    <td align="center" width="250">
      <img src="./assets/img/empty_user.png" width="120" style="border-radius: 50%;">
      <br>
      <strong>김성훈</strong>
    </td>
    <td align="center" width="250">
      <img src="./assets/img/empty_user.png" width="120" style="border-radius: 50%;">
      <br>
      <strong>이승형</strong>
    </td>
    <td align="center" width="250">
      <img src="./assets/img/empty_user.png" width="120" style="border-radius: 50%;">
      <br>
      <strong>임서영</strong>
    </td>
    <td align="center" width="250">
      <img src="./assets/img/empty_user.png" width="120" style="border-radius: 50%;">
      <br>
      <strong>양혜지</strong>
    </td>
    <td align="center" width="250">
      <img src="./assets/img/empty_user.png" width="120" style="border-radius: 50%;">
      <br>
      <strong>허원영</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <sub>인프라</sub>
    </td>
    <td align="center">
      <sub>백엔드</sub>
    </td>
    <td align="center">
      <sub>백엔드</sub>
    </td>
    <td align="center">
      <sub>프론트엔드</sub>
    </td>
    <td align="center">
      <sub>프론트엔드</sub>
    </td>
    <td align="center">
      <sub>AI</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <sub>CI/CD 파이프라인 구축, 배포 파이프라인 구축</sub>
    </td>
    <td align="center">
      <sub>실시간 통신 파이프라인, 인증/인가, API 설계</sub>
    </td>
    <td align="center">
      <sub>실시간 통신 파이프라인, 인증/인가, API 설계</sub>
    </td>
    <td align="center">
      <sub>3D 아바타 립싱크, 실시간 스트리밍 UI, 상태 관리</sub>
    </td>
    <td align="center">
      <sub>3D 아바타 립싱크, 실시간 스트리밍 UI, 상태 관리</sub>
    </td>
    <td align="center">
      <sub>페르소나 추출 프롬프트 엔진, 하이브리드 TTS 학습 및 추론 분기 설계</sub>
    </td>
  </tr>
</table>