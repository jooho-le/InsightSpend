# JCloud Web 배포 가이드

이 프로젝트는 **Firebase Hosting을 사용하지 않고** JCloud에 `apps/web` 빌드 결과물을 올리는 방식으로 배포합니다.

## 1) 빌드

```bash
npm --prefix apps/web install
npm --prefix apps/web run build
```

빌드 결과물은 `apps/web/dist`에 생성됩니다.

## 2) JCloud 업로드

- JCloud 콘솔에서 정적 웹 호스팅/정적 파일 배포 메뉴로 이동
- `apps/web/dist` 폴더 전체를 업로드
- 기본 문서(Entry)는 `index.html`로 설정

## 3) 라우팅 설정

SPA 라우팅이므로 404 시 `index.html`로 리다이렉트되도록 설정하세요.

## 4) 체크리스트

- Firebase Hosting 설정(`firebase.json`) 사용하지 않기
- JCloud 배포 주소에서 정상 렌더링 확인
