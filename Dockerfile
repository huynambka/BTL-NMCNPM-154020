FROM node:16

# Thiết lập thư mục làm việc
RUN mkdir /home/app

WORKDIR /home/app

# Sao chép toàn bộ mã nguồn
COPY ./src ./src

# Sao chép package.json
COPY package.json .

COPY .env.example .
COPY location.json .

# Cài đặt các dependencies
RUN npm install

# Thiết lập biến môi trường
ENV PORT=3000

# Expose port
EXPOSE 3000

# Chạy ứng dụng
CMD [ "npm", "run", "dev" ]

