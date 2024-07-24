#!/bin/bash

# Defina a pasta que você deseja limpar
pasta="/home/deploy/max/backend/public"

# Defina o número de dias após os quais os arquivos serão excluídos
dias=30

# Calcula a data há dias atrás
data_limite=$(date -d "$dias days ago" +%s)

# Loop através de todos os arquivos na pasta
for arquivo in "$pasta"/*; do
    # Verifica se o arquivo é mais antigo que a data limite
    if [ $(stat -c "%Y" "$arquivo") -lt $data_limite ]; then
        # Exclui o arquivo
        rm -f "$arquivo"
        echo "Excluído: $arquivo"
    fi
done
