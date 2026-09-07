package main

import (
	"domino-backend/controllers"
	"domino-backend/database"
	"fmt"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Inisialisasi koneksi MongoDB
	fmt.Println("Menghubungkan ke database...")
	database.ConnectDB()

	// 2. Setup router Gin (Framework Web)
	r := gin.Default()

	// Middleware CORS agar React/Vite (localhost:5173) bisa memanggil API ini
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 3. Routing API
	api := r.Group("/api")
	{
		// Endpoint Profil dan Peringkat
		api.GET("/profile/:username", controllers.GetProfile)
		api.GET("/leaderboard", controllers.GetLeaderboard)
		
		// Endpoint tambahan untuk membuat data testing
		api.POST("/users", controllers.CreateUser)
	}

	// 4. Jalankan server di port 8080
	fmt.Println("Server Golang berjalan di http://localhost:8080")
	r.Run(":8080")
}
