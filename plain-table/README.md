# Plain Tree
Demo: https://metadream.github.io/plain-components/plain-table/plain-table.html

## TODO
1. 列排序
2. 指定列宽
3. 勾选
4. 双层表头

## Usage
```javascript
new PlainTable('#container', {
   width: 800,
   height: 260,
   bordered: true,
   frozenColumns: [2,1],
   columns : [
    { title: '姓名', field: 'name' },
    { title: '年龄', field: 'age' },
    { title: '地址', field: 'address' },
    { title: '薪资', field: 'salary' },
    { title: '部门', field: 'department' },
    { title: '操作', field: 'action' },
  ],
  data: [
    { name: '用户 0', age: 32, address: '地址 0, 城市 0', salary: 5000, department: '部门 0', action: '操作' },
    { name: '用户 1', age: 28, address: '地址 1, 城市 1', salary: 6000, department: '部门 1', action: '操作' },
    { name: '用户 2', age: 25, address1: '地址 2, 城市 2', salary: 7000, department: '部门 2', action: '操作' },
    { name: '用户 3', age: 30, address: '地址 3, 城市 3', salary: 8000, department: '部门 3', action: '操作' },
    { name: '用户 4', age: 35, address: '地址 4, 城市 4', salary: 9000, department: '部门 4', action: '操作' },
    { name: '用户 5', age: 40, address: '地址 5, 城市 5', salary: 10000, department: '部门 5', action: '操作' },
    { name: '用户 6', age: 45, address: '地址 6, 城市 6', salary: 11000, department: '部门 6', action: '操作' },
    { name: '用户 7', age: 50, address: '地址 7, 城市 7', salary: 12000, department: '部门 7', action: '操作' },
    { name: '用户 8', age: 55, address: '地址 8, 城市 8', salary: 13000, department: '部门 8', action: '操作' },
    { name: '用户 9', age: 60, address: '地址 9, 城市 9', salary: 14000, department: '部门 9', action: '操作' }
  ]
});
```