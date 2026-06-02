# Backend Deployment

Deploy the Express API as a Node web service and connect it to a hosted MySQL database.

## Environment Variables

```env
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://songyiiiiii.github.io
JWT_SECRET=replace_with_a_long_random_secret
DB_HOST=your_mysql_host
DB_PORT=your_mysql_port
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_mysql_database
DB_SSL=true
```

## Frontend Runtime Config

After the backend has a public URL, add this GitHub repository variable:

```text
API_BASE_URL=https://your-render-service.onrender.com/api
```

If maps should render on GitHub Pages, add this GitHub repository secret:

```text
MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
```

Then rerun the GitHub Actions workflow or push a new commit.
