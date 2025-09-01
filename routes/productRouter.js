import express from 'express';
import { createProduct, getProducts, deleteProduct, updateProduct, getProductByID } from '../controllers/productController.js';

const productRouter = express.Router();

productRouter.get('/', getProducts);
productRouter.post('/', createProduct);

productRouter.get('/search', (req,res) => {
    res.json({
        message: "Searching!!!"
    });
})

//if we use :productID, it always has to be at the end
productRouter.delete('/:productID', deleteProduct);
productRouter.put('/:productID', updateProduct);
productRouter.get('/:productID', getProductByID);



export default productRouter;