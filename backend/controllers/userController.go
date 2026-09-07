package controllers

import (
	"context"
	"net/http"
	"time"

	"domino-backend/database"
	"domino-backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetProfile mengambil profil pemain dari database berdasarkan username
func GetProfile(c *gin.Context) {
	username := c.Param("username")
	
	collection := database.GetCollection("users")
	var user models.User

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pemain tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// GetLeaderboard mengambil Top 3 pemain berdasarkan skor tertinggi
func GetLeaderboard(c *gin.Context) {
	collection := database.GetCollection("users")
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Urutkan berdasarkan score menurun (descending), batasi (limit) 3 hasil
	findOptions := options.Find()
	findOptions.SetSort(bson.D{{Key: "score", Value: -1}})
	findOptions.SetLimit(3)

	cursor, err := collection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data peringkat"})
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses data peringkat"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// CreateUser mendaftarkan pemain baru (Bantuan untuk testing awal)
func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := collection.InsertOne(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pemain baru"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Pemain berhasil dibuat!"})
}
