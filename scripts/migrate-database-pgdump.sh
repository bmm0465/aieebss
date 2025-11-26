#!/bin/bash

# 데이터베이스 마이그레이션 스크립트 (pg_dump/psql 기반)
# 
# 기존 프로젝트(AIDTPEL)에서 새 프로젝트(AIEEBSS)로 데이터를 마이그레이션합니다.
# 대용량 데이터에 적합한 방법입니다.
#
# 사용법:
#   chmod +x scripts/migrate-database-pgdump.sh
#   ./scripts/migrate-database-pgdump.sh
#
# 환경 변수 (.env.local 파일 필요 또는 직접 설정):
#   OLD_SUPABASE_DB_URL      # 기존 프로젝트 데이터베이스 연결 문자열
#   NEW_SUPABASE_DB_URL      # 새 프로젝트 데이터베이스 연결 문자열
#   DRY_RUN                  # "true"로 설정하면 실제 마이그레이션 없이 미리보기

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# .env.local 파일 로드
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# 환경변수 체크
if [ -z "$OLD_SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ OLD_SUPABASE_DB_URL이 설정되지 않았습니다.${NC}"
    echo "   .env.local 파일에 다음을 추가하세요:"
    echo "   OLD_SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
    exit 1
fi

if [ -z "$NEW_SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ NEW_SUPABASE_DB_URL이 설정되지 않았습니다.${NC}"
    echo "   .env.local 파일에 다음을 추가하세요:"
    echo "   NEW_SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
    exit 1
fi

DRY_RUN=${DRY_RUN:-"false"}

echo -e "${GREEN}🔄 데이터베이스 마이그레이션 시작 (pg_dump/psql 기반)...${NC}\n"

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}👀 Dry-run 모드: 실제 마이그레이션 없이 미리보기만 수행합니다.${NC}\n"
fi

# 임시 파일 경로
DUMP_FILE="supabase_migration_$(date +%Y%m%d_%H%M%S).sql"
SCHEMA_FILE="supabase_schema_$(date +%Y%m%d_%H%M%S).sql"
DATA_FILE="supabase_data_$(date +%Y%m%d_%H%M%S).sql"

# 1. 스키마 덤프
echo -e "${GREEN}📊 1. 스키마 덤프 중...${NC}"
if [ "$DRY_RUN" = "true" ]; then
    echo "   👀 Dry-run: pg_dump --schema-only 실행 예정"
else
    pg_dump "$OLD_SUPABASE_DB_URL" \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f "$SCHEMA_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ 스키마 덤프 완료: $SCHEMA_FILE${NC}"
    else
        echo -e "   ${RED}❌ 스키마 덤프 실패${NC}"
        exit 1
    fi
fi

# 2. 데이터 덤프
echo -e "\n${GREEN}📦 2. 데이터 덤프 중...${NC}"
if [ "$DRY_RUN" = "true" ]; then
    echo "   👀 Dry-run: pg_dump --data-only 실행 예정"
else
    pg_dump "$OLD_SUPABASE_DB_URL" \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        -f "$DATA_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ 데이터 덤프 완료: $DATA_FILE${NC}"
    else
        echo -e "   ${RED}❌ 데이터 덤프 실패${NC}"
        exit 1
    fi
fi

# 3. 스키마 적용 (새 프로젝트)
echo -e "\n${GREEN}📊 3. 새 프로젝트에 스키마 적용 중...${NC}"
if [ "$DRY_RUN" = "true" ]; then
    echo "   👀 Dry-run: psql로 스키마 적용 예정"
else
    # 기존 스키마 백업 (선택적)
    echo "   ℹ️  기존 스키마 백업 권장 (수동으로 수행하세요)"
    
    psql "$NEW_SUPABASE_DB_URL" -f "$SCHEMA_FILE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ 스키마 적용 완료${NC}"
    else
        echo -e "   ${YELLOW}⚠️  스키마 적용 중 일부 오류 발생 (이미 존재하는 객체일 수 있음)${NC}"
    fi
fi

# 4. 데이터 적용 (새 프로젝트)
echo -e "\n${GREEN}📦 4. 새 프로젝트에 데이터 적용 중...${NC}"
if [ "$DRY_RUN" = "true" ]; then
    echo "   👀 Dry-run: psql로 데이터 적용 예정"
    echo "   ⚠️  주의: 이 작업은 시간이 오래 걸릴 수 있습니다."
else
    echo "   ⚠️  데이터 적용 중... (시간이 오래 걸릴 수 있습니다)"
    
    psql "$NEW_SUPABASE_DB_URL" -f "$DATA_FILE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ 데이터 적용 완료${NC}"
    else
        echo -e "   ${YELLOW}⚠️  데이터 적용 중 일부 오류 발생 (중복 키 등)${NC}"
        echo "   상세 로그를 확인하려면: psql \"$NEW_SUPABASE_DB_URL\" -f \"$DATA_FILE\""
    fi
fi

# 5. 정리
if [ "$DRY_RUN" != "true" ]; then
    echo -e "\n${GREEN}🧹 임시 파일 정리 중...${NC}"
    read -p "   임시 덤프 파일을 삭제하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$SCHEMA_FILE" "$DATA_FILE" "$DUMP_FILE"
        echo -e "   ${GREEN}✅ 임시 파일 삭제 완료${NC}"
    else
        echo -e "   ${YELLOW}ℹ️  임시 파일 보관: $SCHEMA_FILE, $DATA_FILE${NC}"
    fi
fi

# 결과 요약
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}📊 마이그레이션 완료${NC}"
echo -e "${GREEN}========================================${NC}\n"

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}👀 Dry-run 모드: 실제로는 마이그레이션되지 않았습니다.${NC}"
    echo "   DRY_RUN=false로 설정하고 다시 실행하세요.\n"
else
    echo -e "${GREEN}✅ 데이터베이스 마이그레이션 완료!${NC}"
    echo -e "\n${YELLOW}⚠️  다음 단계:${NC}"
    echo "   1. verify-migration.ts 스크립트를 실행하여 데이터 무결성 확인"
    echo "   2. optimize-new-project.ts 스크립트를 실행하여 성능 최적화"
    echo "   3. Storage 파일 마이그레이션 수행"
    echo ""
fi

