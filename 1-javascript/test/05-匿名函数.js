
/**
 * 下面代码的输出结果为？
 * 
 */

var b=10;
(function b(params) {
    b=20
    console.log(b); // fn
})()
console.log(b); //10


// 1.本应匿名的函数，如果设置了函数名，在外面无法调用，但是 在函数里面是可以使用的
// 2.类似于创建了长量，这个名字存储的值不能被修改（非严格模式下，但是不会有任何效果，严格模式下会直接报错，我们可以理解为const创建出来的）

/**
 * 如果要求输出10 20，应该怎么改
 */
var b=10;
(function b(params) {
    var b=20
    console.log(b); // 20 里面的b一定需要私有，不能是全局的（声明或者改为形参）
})()
console.log(b); //10