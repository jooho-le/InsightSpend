# JCloud Web 배포 가이드 (2PortGuide: VM + 포트포워딩 방식)

이 프로젝트의 Web(apps/web)은 Firebase Hosting을 쓰지 않고,
JCloud 인스턴스(VM)에서 빌드 결과(dist)를 **포트로 서빙**하는 방식으로 배포합니다.

## 0) 사전 준비: IP/포트 규칙 이해(2PortGuide)
1) 프로젝트 공인 IP 확인 (JCloud 상단 프로젝트 메뉴)
2) 인스턴스 내부 IP 확인: 10.0.0.xxx (xxx를 3자리로 사용)
3) 포트포워딩 규칙:
- 8080 → 10xxx
- 3000 → 13xxx
- 7777(SSH) → 19xxx
- 80(HTTP) → 18xxx

예: 내부 IP가 10.0.0.231이고, 8080으로 서비스하면 외부 접속은 공인IP:10231

## 1) 인스턴스에 SSH 접속
- SSH는 내부 7777을 사용하고, 외부 포트는 19xxx 규칙을 따릅니다.
- 외부 SSH 포트: 19 + (내부IP xxx)

예) 내부 IP가 10.0.0.231이면 SSH 접속 포트는 19231

```bash
ssh -p 19xxx <USER>@<PUBLIC_IP>
