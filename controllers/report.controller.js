const StockOut = require('../models/StockOut');
const StockIn = require('../models/StockIn');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// @desc    Get sales report by date range
// @route   GET /api/reports/sales
// @access  Private/Admin
exports.getSalesReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start and end dates'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    const sales = await StockOut.find({
      saleDate: {
        $gte: start,
        $lte: end
      },
      product: { $exists: true, $ne: null } // Only include sales with valid products
    })
      .populate('product', 'name category unitPrice')
      .sort({ saleDate: -1 });
    
    // Filter out any sales with missing product information
    const validSales = sales.filter(sale => sale.product && sale.product._id);
    
    // Calculate total revenue from valid sales only
    const totalRevenue = validSales.reduce(
      (acc, sale) => acc + (sale.totalAmount || 0),
      0
    );
    
    // Group by product
    const productSales = {};
    validSales.forEach(sale => {
      try {
        if (!sale.product || !sale.product._id) return;
        
        const productId = sale.product._id.toString();
        const productName = sale.product?.name || 'Unknown Product';
        const category = sale.product?.category || 'Uncategorized';
        
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            productName,
            category,
            totalQuantity: 0,
            totalAmount: 0
          };
        }
        
        productSales[productId].totalQuantity += sale.quantity || 0;
        productSales[productId].totalAmount += sale.totalAmount || 0;
      } catch (error) {
        console.error('Error processing sale:', {
          saleId: sale._id,
          error: error.message
        });
      }
    });
    
    // Convert to array and ensure all required fields exist
    const productSalesArray = Object.values(productSales).map(product => ({
      ...product,
      totalQuantity: Number(product.totalQuantity) || 0,
      totalAmount: Number(product.totalAmount) || 0,
      productName: product.productName || 'Unknown Product',
      category: product.category || 'Uncategorized'
    }));
    
    // Group by date
    const dailySales = {};
    validSales.forEach(sale => {
      try {
        if (!sale.saleDate) return;
        
        const date = new Date(sale.saleDate).toISOString().split('T')[0];
        if (!date) return;
        
        if (!dailySales[date]) {
          dailySales[date] = {
            date,
            totalAmount: 0,
            salesCount: 0
          };
        }
        
        dailySales[date].totalAmount += sale.totalAmount || 0;
        dailySales[date].salesCount += 1;
      } catch (error) {
        console.error('Error processing sale date:', {
          saleId: sale._id,
          error: error.message
        });
      }
    });
    
    // Convert to array and sort by date
    const dailySalesArray = Object.values(dailySales).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    res.status(200).json({
      success: true,
      totalSales: sales.length,
      totalRevenue,
      productSales: productSalesArray,
      dailySales: dailySalesArray,
      data: sales
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get stock status report
// @route   GET /api/reports/stock-status
// @access  Private/Admin
exports.getStockStatusReport = async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, name: 1 });
    
    // Group by category
    const categorizedProducts = {};
    products.forEach(product => {
      if (!categorizedProducts[product.category]) {
        categorizedProducts[product.category] = [];
      }
      
      categorizedProducts[product.category].push(product);
    });
    
    // Calculate stock statistics
    const totalProducts = products.length;
    const outOfStockCount = products.filter(p => p.currentStock <= 0).length;
    const lowStockCount = products.filter(p => p.currentStock > 0 && p.currentStock < p.minStockLevel).length;
    const healthyStockCount = products.filter(p => p.currentStock >= p.minStockLevel).length;
    
    res.status(200).json({
      success: true,
      totalProducts,
      outOfStockCount,
      lowStockCount,
      healthyStockCount,
      categorizedProducts,
      data: products
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get supplier deliveries report
// @route   GET /api/reports/supplier-deliveries
// @access  Private/Admin
exports.getSupplierDeliveriesReport = async (req, res) => {
  try {
    let { startDate, endDate, supplierId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start and end dates'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    let query = {
      deliveryDate: {
        $gte: start,
        $lte: end
      }
    };
    
    if (supplierId) {
      query.supplier = supplierId;
    }
    
    const deliveries = await StockIn.find(query)
      .populate('product', 'name category unitPrice')
      .populate('supplier', 'name contactPerson phone')
      .sort({ deliveryDate: -1 });
    
    // Calculate totals
    const totalAmount = deliveries.reduce(
      (acc, delivery) => acc + delivery.totalAmount,
      0
    );
    
    const totalPaid = deliveries.reduce(
      (acc, delivery) => acc + delivery.amountPaid,
      0
    );
    
    const totalDebt = deliveries.reduce(
      (acc, delivery) => acc + delivery.remainingDebt,
      0
    );
    
    // Group by supplier
    const supplierDeliveries = {};
    deliveries.forEach(delivery => {
      const supplierId = delivery.supplier._id.toString();
      if (!supplierDeliveries[supplierId]) {
        supplierDeliveries[supplierId] = {
          supplierId,
          supplierName: delivery.supplier.name,
          deliveryCount: 0,
          totalAmount: 0,
          amountPaid: 0,
          remainingDebt: 0
        };
      }
      
      supplierDeliveries[supplierId].deliveryCount += 1;
      supplierDeliveries[supplierId].totalAmount += delivery.totalAmount;
      supplierDeliveries[supplierId].amountPaid += delivery.amountPaid;
      supplierDeliveries[supplierId].remainingDebt += delivery.remainingDebt;
    });
    
    // Convert to array
    const supplierDeliveriesArray = Object.values(supplierDeliveries);
    
    res.status(200).json({
      success: true,
      totalDeliveries: deliveries.length,
      totalAmount,
      totalPaid,
      totalDebt,
      supplierDeliveries: supplierDeliveriesArray,
      data: deliveries
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get profit report
// @route   GET /api/reports/profit
// @access  Private/Admin
exports.getProfitReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start and end dates'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    // Get sales in date range
    const sales = await StockOut.find({
      saleDate: {
        $gte: start,
        $lte: end
      }
    }).populate('product');
    
    // Calculate revenue
    const totalRevenue = sales.reduce(
      (acc, sale) => acc + sale.totalAmount,
      0
    );
    
    // Get cost of goods sold
    const costOfGoodsSold = await calculateCostOfGoodsSold(sales);
    
    // Calculate profit
    const grossProfit = totalRevenue - costOfGoodsSold;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // Product profitability
    const productProfitability = await calculateProductProfitability(sales);
    
    res.status(200).json({
      success: true,
      period: {
        startDate: start,
        endDate: end
      },
      totalRevenue,
      costOfGoodsSold,
      grossProfit,
      profitMargin,
      productProfitability,
      salesCount: sales.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get outstanding debts report
// @route   GET /api/reports/outstanding-debts
// @access  Private/Admin
exports.getOutstandingDebtsReport = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ totalDebt: { $gt: 0 } })
      .sort({ totalDebt: -1 });
    
    // Get unpaid or partially paid deliveries
    const unpaidDeliveries = await StockIn.find({
      paymentStatus: { $ne: 'Paid' },
      remainingDebt: { $gt: 0 }
    })
      .populate('product', 'name')
      .populate('supplier', 'name')
      .sort({ deliveryDate: -1 });
    
    // Calculate total debt
    const totalDebt = suppliers.reduce(
      (acc, supplier) => acc + supplier.totalDebt,
      0
    );
    
    // Group deliveries by supplier
    const supplierDebts = {};
    unpaidDeliveries.forEach(delivery => {
      const supplierId = delivery.supplier._id.toString();
      if (!supplierDebts[supplierId]) {
        supplierDebts[supplierId] = {
          supplierId,
          supplierName: delivery.supplier.name,
          totalDebt: 0,
          deliveries: []
        };
      }
      
      supplierDebts[supplierId].totalDebt += delivery.remainingDebt;
      supplierDebts[supplierId].deliveries.push({
        id: delivery._id,
        productName: delivery.product.name,
        deliveryDate: delivery.deliveryDate,
        totalAmount: delivery.totalAmount,
        amountPaid: delivery.amountPaid,
        remainingDebt: delivery.remainingDebt
      });
    });
    
    // Convert to array
    const supplierDebtsArray = Object.values(supplierDebts);
    
    res.status(200).json({
      success: true,
      totalDebt,
      suppliersWithDebtCount: suppliers.length,
      suppliers,
      supplierDebts: supplierDebtsArray,
      unpaidDeliveries
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get product sales report
// @route   GET /api/reports/product-sales
// @access  Private/Admin
exports.getProductSalesReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start and end dates'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    // Get all products with their sales data
    const products = await Product.find({})
      .select('name category quantityInStock unitPrice')
      .lean();
    
    // Get all sales in the date range
    const sales = await StockOut.find({
      saleDate: {
        $gte: start,
        $lte: end
      }
    }).populate('product', 'name category unitPrice');
    
    // Process product sales data
    const productSales = products.map(product => {
      const productSales = sales.filter(sale => 
        sale.product && sale.product._id.toString() === product._id.toString()
      );
      
      const quantitySold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalRevenue = productSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const averagePrice = quantitySold > 0 ? totalRevenue / quantitySold : 0;
      
      // Get previous period sales for comparison
      return {
        id: product._id,
        productName: product.name,
        category: product.category,
        quantitySold,
        currentStock: product.quantityInStock,
        totalRevenue,
        averagePrice,
        revenueChange: 0 // This would require historical data to calculate
      };
    });
    
    // Calculate totals
    const totalProducts = products.length;
    const totalProductsSold = productSales.reduce((sum, p) => sum + p.quantitySold, 0);
    const totalRevenue = productSales.reduce((sum, p) => sum + p.totalRevenue, 0);
    const averageSalePrice = totalProductsSold > 0 ? totalRevenue / totalProductsSold : 0;
    
    res.json({
      success: true,
      products: productSales,
      totalProducts,
      totalProductsSold,
      totalRevenue,
      averageSalePrice
    });
    
  } catch (error) {
    console.error('Error in getProductSalesReport:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating product sales report'
    });
  }
};

// Helper functions
async function calculateCostOfGoodsSold(sales) {
  let costOfGoodsSold = 0;
  
  for (const sale of sales) {
    // Find the average purchase price for this product
    const stockIns = await StockIn.find({ product: sale.product._id });
    
    if (stockIns.length > 0) {
      // Calculate average cost
      const totalCost = stockIns.reduce((acc, stockIn) => acc + stockIn.unitPrice, 0);
      const avgCost = totalCost / stockIns.length;
      
      // Multiply by quantity sold
      costOfGoodsSold += avgCost * sale.quantity;
    }
  }
  
  return costOfGoodsSold;
}

async function calculateProductProfitability(sales) {
  const productMap = {};
  
  for (const sale of sales) {
    const productId = sale.product._id.toString();
    if (!productMap[productId]) {
      productMap[productId] = {
        productId,
        productName: sale.product.name,
        revenue: 0,
        quantitySold: 0,
        cost: 0,
        profit: 0,
        profitMargin: 0
      };
      
      // Find the average purchase price for this product
      const stockIns = await StockIn.find({ product: sale.product._id });
      
      if (stockIns.length > 0) {
        const totalCost = stockIns.reduce((acc, stockIn) => acc + stockIn.unitPrice, 0);
        const avgCost = totalCost / stockIns.length;
        
        productMap[productId].avgCost = avgCost;
      } else {
        productMap[productId].avgCost = 0;
      }
    }
    
    productMap[productId].revenue += sale.totalAmount;
    productMap[productId].quantitySold += sale.quantity;
    productMap[productId].cost += productMap[productId].avgCost * sale.quantity;
  }
  
  // Calculate profit and profit margin for each product
  Object.values(productMap).forEach(product => {
    product.profit = product.revenue - product.cost;
    product.profitMargin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
  });
  
  // Sort by profit (highest first)
  return Object.values(productMap).sort((a, b) => b.profit - a.profit);
}
