const express = require('express');
var mongoose = require("mongoose");
const router = express.Router();
//just specify in the query options for example such as _method=PATCH to use a patch method
//but the actual form method is post/get 
//will be used when deleting all tags for example
var methodOverride = require('method-override')
router.use(methodOverride('_method'))
const axios = require('axios');


//Next 2 endpoints request from a python server that is running on port 8000 
router.get('/Search/:query', async (req, res) => {
  const query = req.params.query
  serverUtil.writeToFile('./RecipeDataModel.json',recipeModel)

  await axios.get('http://127.0.0.1:8000/Search', { 
    params: {
      content: query
    }
  }).then((response) => {
    return res.status(200).send(response.data);
  
}).catch((error) => {console.log(error)})})

router.get('/Recommendation/:query', async (req, res) => {
  serverUtil.writeToFile('./UserDataModel.json',userModel)

  const query = req.params.query
  await axios.get('http://127.0.0.1:8000/Recommendation', { 
    params: {
      content: query
    }
  }).then((response) => {
    return res.status(200).send(response.data);
  
}).catch((error) => {console.log(error)})})


const { recipeModel, Tag } = require("../models/recipeModel.js"); //. for windows
const userModel = require("../models/userModel.js");
const userAuth = require("../basicAuth.js")
const serverUtil = require("../serverUtil.js")


module.exports = router

router.delete('/resource', (req, res) => {
  console.log('DELETE route is working');
  res.status(200).json({ message: 'This is a DELETE request' });
});
//GET----------------------------------

//Get all recipes 
router.get("/", function (req, res, next) {
    //label cache-ability
    res.set("Cache-control", `no-store`);

    tags = req.query.tags;
    searchTerm = req.query.title;

    var recipes;
    //users can only filter or search not both
    if (tags) {
      recipes = recipeModel.find({ tags: { $in: tags } });
    } else if (searchTerm) {
      recipes = recipeModel.find({ $text: { $search: searchTerm } });
    } else {
      recipes = recipeModel.find({});
    }

    recipes
      .then(function (recipes) {
        res.status(200).json({ recipes: recipes });
      })
      .catch(function (error) {
        error.status=400
        return next(error); // Handle the error using Express's error handling middleware
      });
  });

//Get all tags
router.get("/tags", function (req, res, next) {
    //label cache-ability
    res.set("Cache-control", `no-store`);
    Tag.find({})
      .then(function (tags) {
        res.status(200).json({ tags: tags });
      })
      .catch(function (error) {
        error.status=400
        return next(error); // Handle the error using Express's error handling middleware
    });
});

router.get("/tags/:tagId",function(req,res,next){
  Tag.findById(req.params.tagId).then(tag=>{
    res.status(200).json({tag:tag})
  }).catch(err=>{
     err.status=404
     return next(err)
  })
})



// hateoas
router.get("/:id", async (req, res, next) => {

  const recipeId = req.params.id
  recipeModel.findById(recipeId).then(recipe => {
    const links = [
        // HATEOAS links
      { rel: "itself", href: `/v1/recipes/${recipe._id}` },
      { rel: "edit", href: `/v1/users/${recipe.owner}/edit-recipe/${recipe._id}` },
      { rel: "delete", href: `/v1/users/${recipe.owner}/deleteOne/${recipe._id}` }
    ];
    res.status(200).json({ recipe: recipe, links: links});
  })
  .catch(function(error){
    error.status= 404
    return next(error)
  });

});

//replace a recipe
//TODO ADD BACK USER AUUTH
//THIS HAD BOTH
router.post("/tags",async function(req,res,next){
  const newTag = req.body.tag
  const existingTag = await Tag.find({name:newTag})//will return empty so check for if not tag
  if(existingTag.length>0){return res.status(409).json({messsage:"Tag already exists"})}
  else{
    await new Tag({name:newTag}).save().then((result)=>{
      return res.status(201).json({tag:result})
    }).catch(err=>{
      err.status=400
      return next(err)
    })
  }
})

//THIS USED TO BE IN USER ROUTER PUT BACK IF BREAKS
router.put("/:recipeId", async (req, res, next) => {
  const id = req.params.recipeId

  const updatedRecipeData = req.body;
  const unformattedTags = req.body.tags;

  const formattedTags = await serverUtil.handleExistingTags(unformattedTags, Tag);
  updatedRecipeData.tags = formattedTags;


  await recipeModel.findByIdAndUpdate(id,
    {$set:updatedRecipeData, 
      tags:formattedTags})
    
    .then(()=>{
    return res.status(200).json({message:"Recipe replaced"})})
    .catch(err=>{
      err.status=404
      return next(err)
    })

});



//Delete recipe by id 
router.delete('/:recipeId/users/:userId/delete', function (req, res, next) {
    var recipeId = req.params.recipeId
    var userId = req.params.userId

    try{
        updateOneUserRecipe(userId, recipeId)
    }catch(err){
      err.status=400 //bad request to update the user
        return next(err)
    }

    recipeModel.findByIdAndRemove(recipeId)//Deletes the actual recipe
      .then(function (recipe) {
        if (!recipe) {
          return res.status(404).json({ message: "Recipe does not exist" })
        }
        return res.status(200).json({ message: "Recipe deleted", body: recipe })
      }).catch(function (err) {
        err.status=400 //bad request to delete recipe
        return next(err)
      })

  })

  router.delete("/tags",async function(req,res,next){
    Tag.deleteMany({}).then(()=>{
      return res.status(200).json({message:"All tags are deleted"})}
    ).catch(err=>{  
      err.status=404
      return next(err)
    })
  })

  
  
  

// //Delete all recipes from specific userId
// router.delete('/deleteAllFromUser', userAuth.authUser, function(req, res, next) {
//     const userId = req.user.id;
//     deleteManyUserRecipe(req, userId)

//     recipeModel.find({ owner: userId }).then(function(recipes) {
//         if (recipes.length === 0) {
//             return res.status(404).json({ message: "No recipes to delete" });
//         }

//         const recipeIds = recipes.map(recipe => recipe.id);

//         recipeModel.deleteMany({ _id: { $in: recipeIds } })
//             .then(function(result) {
//                 return res.status(200).json({ message: "Recipes deleted", body: result });
//             })
//             .catch(function(error) {
//                 return next(error);
//             });
//     }).catch(function(error) {
//         return next(error);
//     });
//   }); 


//Deletes the reference of one recipeId 
function updateOneUserRecipe(userId, recipeId){
    userModel.findOneAndUpdate(
        { _id: userId },
        { $pull: { recipes: recipeId } },
        { new: true }).then(function(updatedUser){
                console.log("User recipes updated successfully:", updatedUser);
        }).catch(function(err){
                console.error("Error updating user:", err);
        })
}

// //Deletes the reference of many recipeId
// async function deleteManyUserRecipe(req, userId){
//     var recipesToRemove = []
//     recipesToRemove = req.user.recipes

//     await userModel.findOneAndUpdate({_id:userId}, { $set: { recipes: [] }}).then(function(updatedUser){
//                 console.log("User recipes updated successfully:", updatedUser);
//         }).catch(function(err){
//                 console.error("Error updating user:", err);
//         })
// }
